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

const SUPPORTED_UNITS = ["oz", "ml"] as const;

function isSupportedUnit(unit: string): unit is HydrationUnit {
  return SUPPORTED_UNITS.includes(unit as HydrationUnit);
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

    const { amount, unit = user.preferredHydrationUnit, loggedAt } = req.body;
    const numericAmount = Number(amount);
    const normalizedUnit = String(unit).toLowerCase();
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      res.status(400).json({ error: "Hydration amount must be a positive number." });
      return;
    }
    if (!isSupportedUnit(normalizedUnit)) {
      res.status(400).json({ error: "Hydration unit must be either oz or ml." });
      return;
    }

    const parsedLoggedAt = loggedAt ? new Date(loggedAt) : undefined;
    if (parsedLoggedAt && Number.isNaN(parsedLoggedAt.getTime())) {
      res.status(400).json({ error: "The hydration date is invalid." });
      return;
    }

    const hydrationEntry = await prisma.hydration.create({
      data: {
        userId,
        amount: numericAmount,
        unit: normalizedUnit,
        amountMl: toMilliliters(numericAmount, normalizedUnit),
        ...(parsedLoggedAt ? { loggedAt: parsedLoggedAt } : {}),
      },
    });

    res.status(201).json({ message: "Hydration entry created successfully.", hydration: hydrationEntry });
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
      select: { timeZone: true },
    });
    if (!user) {
      res.status(404).json({ error: "User profile not found." });
      return;
    }

    const timeZone = user.timeZone || "UTC";
    const requestedDate =
      typeof req.query.date === "string"
        ? req.query.date
        : getDateKeyInTimeZone(new Date(), timeZone);

    let dayRange: { start: Date; endExclusive: Date };
    try {
      dayRange = getUtcDayRange(requestedDate, timeZone);
    } catch {
      res.status(400).json({ error: "The requested date or profile timezone is invalid." });
      return;
    }

    const entries = await prisma.hydration.findMany({
      where: {
        userId,
        loggedAt: {
          gte: dayRange.start,
          lt: dayRange.endExclusive,
        },
      },
      orderBy: { loggedAt: "asc" },
    });
    const totalMl = entries.reduce((total, entry) => total + entry.amountMl, 0);

    res.status(200).json({
      date: requestedDate,
      timeZone,
      totalMl: roundMeasurement(totalMl),
      totalOz: roundMeasurement(fromMilliliters(totalMl, "oz")),
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
