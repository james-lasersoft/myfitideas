import type { Response } from "express";
import prisma from "../config/prisma.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  fromMilliliters,
  roundMeasurement,
  toMilliliters,
  type HydrationUnit,
} from "../utils/measurements.js";
import {
  getDateKeyInTimeZone,
  getUtcDayRange,
} from "../utils/timezone.js";
import {
  validateHydrationAmountMl,
  validateHydrationDate,
} from "../utils/data-integrity.js";
import {
  getHydrationCoefficient,
  isBeverageType,
  type BeverageType,
} from "../domain/hydration-coefficients.js";

const SUPPORTED_UNITS = ["oz", "ml"] as const;
const DUPLICATE_WINDOW_MS = 30_000;
const DAILY_CONFIRMATION_THRESHOLD_ML = 7570;

function isSupportedUnit(unit: string): unit is HydrationUnit {
  return SUPPORTED_UNITS.includes(unit as HydrationUnit);
}

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function normalizeBeverageType(value: unknown): BeverageType {
  const normalized = String(value ?? "water").trim().toLowerCase();
  return isBeverageType(normalized) ? normalized : "other";
}

export async function createHydrationEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Authentication is required." });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: "User profile not found." });
      return;
    }

    const { amount, unit = user.preferredHydrationUnit, loggedAt, confirmAnomaly, beverageType } = req.body;
    const numericAmount = Number(amount);
    const normalizedUnit = String(unit).toLowerCase();
    if (!isSupportedUnit(normalizedUnit)) {
      res.status(400).json({ error: "Hydration unit must be either oz or ml." });
      return;
    }

    const amountMl = toMilliliters(numericAmount, normalizedUnit);
    const amountError = validateHydrationAmountMl(amountMl);
    if (amountError) {
      res.status(400).json({ code: "HYDRATION_OUT_OF_RANGE", error: amountError });
      return;
    }

    const normalizedBeverageType = normalizeBeverageType(beverageType);
    const hydrationCoefficient = getHydrationCoefficient(normalizedBeverageType);
    const effectiveAmountMl = amountMl * hydrationCoefficient;

    const parsedLoggedAt = loggedAt ? new Date(loggedAt) : new Date();
    const dateError = validateHydrationDate(parsedLoggedAt);
    if (dateError) {
      res.status(400).json({ code: "HYDRATION_DATE_INVALID", error: dateError });
      return;
    }

    const timeZone = user.timezone || "UTC";
    const dateKey = getDateKeyInTimeZone(parsedLoggedAt, timeZone);
    const dayRange = getUtcDayRange(dateKey, timeZone);
    const [sameDayEntries, possibleDuplicate] = await Promise.all([
      prisma.hydration.findMany({
        where: { userId, loggedAt: { gte: dayRange.start, lt: dayRange.endExclusive } },
        select: { amountMl: true },
      }),
      prisma.hydration.findFirst({
        where: {
          userId,
          amountMl: { gte: amountMl - 0.01, lte: amountMl + 0.01 },
          loggedAt: {
            gte: new Date(parsedLoggedAt.getTime() - DUPLICATE_WINDOW_MS),
            lte: new Date(parsedLoggedAt.getTime() + DUPLICATE_WINDOW_MS),
          },
        },
        select: { id: true, loggedAt: true },
      }),
    ]);

    const projectedDailyTotalMl = sameDayEntries.reduce((sum, entry) => sum + entry.amountMl, 0) + amountMl;
    const issues = [
      ...(possibleDuplicate ? [{ code: "POSSIBLE_DUPLICATE_HYDRATION", severity: "confirmation_required", message: "A matching hydration entry was logged within 30 seconds." }] : []),
      ...(projectedDailyTotalMl > DAILY_CONFIRMATION_THRESHOLD_ML ? [{ code: "UNUSUAL_DAILY_HYDRATION_TOTAL", severity: "confirmation_required", message: "This entry would raise the daily total above 256 oz or 7,570 ml." }] : []),
      ...(amountMl > Math.max(user.dailyHydrationGoalMl, 1) * 1.5 ? [{ code: "LARGE_HYDRATION_ENTRY", severity: "warning", message: "This single entry is more than 150% of your daily hydration goal." }] : []),
    ];

    if (issues.some((issue) => issue.severity === "confirmation_required") && confirmAnomaly !== true) {
      res.status(409).json({
        code: "HYDRATION_CONFIRMATION_REQUIRED",
        error: "Please confirm this unusual hydration entry.",
        issues,
        details: { amountMl, projectedDailyTotalMl, date: dateKey },
      });
      return;
    }

    const hydrationEntry = await prisma.hydration.create({
      data: {
        userId,
        amount: numericAmount,
        unit: normalizedUnit,
        amountMl,
        beverageType: normalizedBeverageType,
        hydrationCoefficient,
        effectiveAmountMl,
        loggedAt: parsedLoggedAt,
      },
    });

    res.status(201).json({ message: "Hydration entry created successfully.", hydration: hydrationEntry, warnings: issues });
  } catch (error) {
    console.error("Create hydration entry error:", error);
    res.status(500).json({ error: "Unable to create hydration entry." });
  }
}

export async function getHydrationEntries(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Authentication is required." });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: "User profile not found." });
      return;
    }

    const unit = user.preferredHydrationUnit as HydrationUnit;
    const rows = await prisma.hydration.findMany({ where: { userId }, orderBy: { loggedAt: "desc" } });
    const hydration = rows.map((row) => ({
      ...row,
      amount: roundMeasurement(fromMilliliters(row.amountMl, unit)),
      effectiveAmount: roundMeasurement(fromMilliliters(row.effectiveAmountMl, unit)),
      unit,
    }));
    res.status(200).json({ hydration });
  } catch (error) {
    console.error("Get hydration entries error:", error);
    res.status(500).json({ error: "Unable to retrieve hydration entries." });
  }
}

export async function getDailyHydrationTotal(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Authentication is required." });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    if (!user) {
      res.status(404).json({ error: "User profile not found." });
      return;
    }

    const requestedTimeZone = typeof req.query.timeZone === "string" ? req.query.timeZone : undefined;
    if (requestedTimeZone && !isValidTimeZone(requestedTimeZone)) {
      res.status(400).json({ error: "The requested timezone is invalid." });
      return;
    }

    const timeZone = requestedTimeZone ?? user.timezone ?? "UTC";
    const requestedDate = typeof req.query.date === "string" ? req.query.date : getDateKeyInTimeZone(new Date(), timeZone);

    let dayRange: { start: Date; endExclusive: Date };
    try {
      dayRange = getUtcDayRange(requestedDate, timeZone);
    } catch {
      res.status(400).json({ error: "The requested date or timezone is invalid." });
      return;
    }

    const entries = await prisma.hydration.findMany({
      where: {
        userId,
        loggedAt: { gte: dayRange.start, lt: dayRange.endExclusive },
      },
      orderBy: { loggedAt: "asc" },
    });
    const totalMl = entries.reduce((total, entry) => total + entry.amountMl, 0);
    const effectiveTotalMl = entries.reduce((total, entry) => total + entry.effectiveAmountMl, 0);

    res.status(200).json({
      date: requestedDate,
      timeZone,
      totalMl: roundMeasurement(totalMl),
      totalOz: roundMeasurement(fromMilliliters(totalMl, "oz")),
      effectiveTotalMl: roundMeasurement(effectiveTotalMl),
      effectiveTotalOz: roundMeasurement(fromMilliliters(effectiveTotalMl, "oz")),
      entries,
    });
  } catch (error) {
    console.error("Get daily hydration total error:", error);
    res.status(500).json({ error: "Unable to calculate the daily hydration total." });
  }
}

export async function deleteHydrationEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const rawId = req.params.id;
    const id = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : undefined;
    if (!userId) {
      res.status(401).json({ error: "Authentication is required." });
      return;
    }
    if (!id) {
      res.status(400).json({ error: "A valid hydration entry ID is required." });
      return;
    }

    const existingEntry = await prisma.hydration.findFirst({ where: { id, userId } });
    if (!existingEntry) {
      res.status(404).json({ error: "Hydration entry not found." });
      return;
    }

    await prisma.hydration.delete({ where: { id } });
    res.status(200).json({ message: "Hydration entry deleted successfully." });
  } catch (error) {
    console.error("Delete hydration entry error:", error);
    res.status(500).json({ error: "Unable to delete hydration entry." });
  }
}
