import type { Response } from "express";
import prisma from "../config/prisma.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  fromKilograms,
  fromMilliliters,
  roundMeasurement,
  toKilograms,
  toMilliliters,
  type HydrationUnit,
  type LengthUnit,
  type WeightUnit,
} from "../utils/measurements.js";

const WEIGHT_UNITS = ["lb", "kg"] as const;
const LENGTH_UNITS = ["in", "cm"] as const;
const HYDRATION_UNITS = ["oz", "ml"] as const;
const LANGUAGES = ["en", "pt-BR"] as const;
const DATE_FORMATS = ["LOCALE", "MM_DD_YYYY", "DD_MM_YYYY", "YYYY_MM_DD"] as const;
const TIME_FORMATS = ["12", "24"] as const;
const WEEK_STARTS = ["SUNDAY", "MONDAY"] as const;

type Language = (typeof LANGUAGES)[number];
type DateFormat = (typeof DATE_FORMATS)[number];
type TimeFormat = (typeof TIME_FORMATS)[number];
type WeekStart = (typeof WEEK_STARTS)[number];

interface UpdateProfileRequestBody {
  firstName?: string;
  lastName?: string | null;
  heightCm?: number | null;
  preferredWeightUnit?: WeightUnit;
  preferredLengthUnit?: LengthUnit;
  preferredHydrationUnit?: HydrationUnit;
  preferredLanguage?: Language;
  preferredDateFormat?: DateFormat;
  preferredTimeFormat?: TimeFormat;
  preferredWeekStart?: WeekStart;
  timezone?: string;
  dailyHydrationGoal?: number;
  targetWeight?: number | null;
}

function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function presentProfile(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  heightCm: number | null;
  preferredWeightUnit: string;
  preferredLengthUnit: string;
  preferredHydrationUnit: string;
  preferredLanguage: string;
  preferredDateFormat: string;
  preferredTimeFormat: string;
  preferredWeekStart: string;
  timezone: string;
  dailyHydrationGoal: number;
  dailyHydrationGoalMl: number;
  targetWeight: number | null;
  targetWeightKg: number | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const weightUnit = user.preferredWeightUnit as WeightUnit;
  const hydrationUnit = user.preferredHydrationUnit as HydrationUnit;
  return {
    ...user,
    targetWeight: user.targetWeightKg == null ? null : roundMeasurement(fromKilograms(user.targetWeightKg, weightUnit)),
    dailyHydrationGoal: roundMeasurement(fromMilliliters(user.dailyHydrationGoalMl, hydrationUnit)),
  };
}

const profileSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  heightCm: true,
  preferredWeightUnit: true,
  preferredLengthUnit: true,
  preferredHydrationUnit: true,
  preferredLanguage: true,
  preferredDateFormat: true,
  preferredTimeFormat: true,
  preferredWeekStart: true,
  timezone: true,
  dailyHydrationGoal: true,
  dailyHydrationGoalMl: true,
  targetWeight: true,
  targetWeightKg: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Authentication is required." });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: profileSelect });
    if (!user) {
      res.status(404).json({ error: "User profile not found." });
      return;
    }

    res.status(200).json({ profile: presentProfile(user) });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Unable to retrieve the user profile." });
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Authentication is required." });
      return;
    }

    const current = await prisma.user.findUnique({ where: { id: userId } });
    if (!current) {
      res.status(404).json({ error: "User profile not found." });
      return;
    }

    const body = req.body as UpdateProfileRequestBody;
    if (body.firstName !== undefined && body.firstName.trim().length === 0) {
      res.status(400).json({ error: "First name cannot be empty." });
      return;
    }
    if (body.heightCm !== undefined && body.heightCm !== null && (!Number.isFinite(body.heightCm) || body.heightCm < 50 || body.heightCm > 300)) {
      res.status(400).json({ error: "Height must be between 50 and 300 centimeters." });
      return;
    }
    if (body.preferredWeightUnit !== undefined && !WEIGHT_UNITS.includes(body.preferredWeightUnit)) {
      res.status(400).json({ error: "Preferred weight unit must be lb or kg." });
      return;
    }
    if (body.preferredLengthUnit !== undefined && !LENGTH_UNITS.includes(body.preferredLengthUnit)) {
      res.status(400).json({ error: "Preferred length unit must be in or cm." });
      return;
    }
    if (body.preferredHydrationUnit !== undefined && !HYDRATION_UNITS.includes(body.preferredHydrationUnit)) {
      res.status(400).json({ error: "Preferred hydration unit must be oz or ml." });
      return;
    }
    if (body.preferredLanguage !== undefined && !LANGUAGES.includes(body.preferredLanguage)) {
      res.status(400).json({ error: "Preferred language must be en or pt-BR." });
      return;
    }
    if (body.preferredDateFormat !== undefined && !DATE_FORMATS.includes(body.preferredDateFormat)) {
      res.status(400).json({ error: "Preferred date format is not supported." });
      return;
    }
    if (body.preferredTimeFormat !== undefined && !TIME_FORMATS.includes(body.preferredTimeFormat)) {
      res.status(400).json({ error: "Preferred time format must be 12 or 24." });
      return;
    }
    if (body.preferredWeekStart !== undefined && !WEEK_STARTS.includes(body.preferredWeekStart)) {
      res.status(400).json({ error: "Preferred week start must be Sunday or Monday." });
      return;
    }
    if (body.timezone !== undefined && !isTimeZone(body.timezone)) {
      res.status(400).json({ error: "Timezone must be a valid IANA time-zone identifier." });
      return;
    }
    if (body.dailyHydrationGoal !== undefined && (!Number.isFinite(body.dailyHydrationGoal) || body.dailyHydrationGoal <= 0)) {
      res.status(400).json({ error: "Daily hydration goal must be greater than zero." });
      return;
    }
    if (body.targetWeight !== undefined && body.targetWeight !== null && (!Number.isFinite(body.targetWeight) || body.targetWeight <= 0)) {
      res.status(400).json({ error: "Target weight must be greater than zero." });
      return;
    }

    const inputWeightUnit = body.preferredWeightUnit ?? (current.preferredWeightUnit as WeightUnit);
    const inputHydrationUnit = body.preferredHydrationUnit ?? (current.preferredHydrationUnit as HydrationUnit);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(body.firstName !== undefined ? { firstName: body.firstName.trim() } : {}),
        ...(body.lastName !== undefined ? { lastName: body.lastName === null || body.lastName.trim() === "" ? null : body.lastName.trim() } : {}),
        ...(body.heightCm !== undefined ? { heightCm: body.heightCm } : {}),
        ...(body.preferredWeightUnit !== undefined ? { preferredWeightUnit: body.preferredWeightUnit } : {}),
        ...(body.preferredLengthUnit !== undefined ? { preferredLengthUnit: body.preferredLengthUnit } : {}),
        ...(body.preferredHydrationUnit !== undefined ? { preferredHydrationUnit: body.preferredHydrationUnit } : {}),
        ...(body.preferredLanguage !== undefined ? { preferredLanguage: body.preferredLanguage } : {}),
        ...(body.preferredDateFormat !== undefined ? { preferredDateFormat: body.preferredDateFormat } : {}),
        ...(body.preferredTimeFormat !== undefined ? { preferredTimeFormat: body.preferredTimeFormat } : {}),
        ...(body.preferredWeekStart !== undefined ? { preferredWeekStart: body.preferredWeekStart } : {}),
        ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
        ...(body.dailyHydrationGoal !== undefined ? {
          dailyHydrationGoal: body.dailyHydrationGoal,
          dailyHydrationGoalMl: toMilliliters(body.dailyHydrationGoal, inputHydrationUnit),
        } : {}),
        ...(body.targetWeight !== undefined ? {
          targetWeight: body.targetWeight,
          targetWeightKg: body.targetWeight === null ? null : toKilograms(body.targetWeight, inputWeightUnit),
        } : {}),
      },
      select: profileSelect,
    });

    res.status(200).json({ message: "Profile updated successfully.", profile: presentProfile(updated) });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Unable to update the user profile." });
  }
}
