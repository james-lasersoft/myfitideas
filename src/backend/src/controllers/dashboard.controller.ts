import type { Response } from "express";
import prisma from "../config/prisma.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { calculateBmi } from "../utils/body-composition.js";
import { toKilograms } from "../utils/measurements.js";

const ML_PER_OUNCE = 29.5735;

export async function getDashboardSummary(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        error: "Authentication is required.",
      });
      return;
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const [user, measurements, hydrationEntries] =
      await Promise.all([
        prisma.user.findUnique({
          where: {
            id: userId,
          },
          select: {
            heightCm: true,
            preferredWeightUnit: true,
            preferredHydrationUnit: true,
            dailyHydrationGoal: true,
            targetWeight: true,
          },
        }),

        prisma.measurement.findMany({
          where: {
            userId,
            weight: {
              not: null,
            },
          },
          orderBy: {
            measurementDate: "desc",
          },
          take: 2,
        }),

        prisma.hydration.findMany({
          where: {
            userId,
            loggedAt: {
              gte: startOfToday,
              lte: endOfToday,
            },
          },
        }),
      ]);

    if (!user) {
      res.status(404).json({
        error: "User profile not found.",
      });
      return;
    }

    const currentMeasurement = measurements[0] ?? null;
    const previousMeasurement = measurements[1] ?? null;

    const currentWeight = currentMeasurement?.weight ?? null;
    const previousWeight = previousMeasurement?.weight ?? null;

    const weightDifference =
      currentWeight !== null && previousWeight !== null
        ? Number((currentWeight - previousWeight).toFixed(2))
        : null;

    const bmi = currentWeight === null
      ? null
      : calculateBmi(toKilograms(currentWeight, user.preferredWeightUnit === "kg" ? "kg" : "lb"), user.heightCm);
    let bmiCategory: string | null = null;

    if (bmi !== null) {
      if (bmi < 18.5) {
        bmiCategory = "Underweight";
      } else if (bmi < 25) {
        bmiCategory = "Healthy weight";
      } else if (bmi < 30) {
        bmiCategory = "Overweight";
      } else {
        bmiCategory = "Obesity";
      }
    }

    const todayWaterMl = hydrationEntries.reduce(
      (total, entry) => {
        const normalizedUnit = entry.unit.toLowerCase();

        if (normalizedUnit === "ml") {
          return total + entry.amount;
        }

        return total + entry.amount * ML_PER_OUNCE;
      },
      0
    );

    const todayWaterOz = todayWaterMl / ML_PER_OUNCE;

    res.status(200).json({
      currentWeight,
      previousWeight,
      weightDifference,
      bmi,
      bmiCategory,
      todayWaterOz: Number(todayWaterOz.toFixed(2)),
      todayWaterMl: Number(todayWaterMl.toFixed(2)),
      lastMeasurementDate:
        currentMeasurement?.measurementDate ?? null,
      preferredWeightUnit: user.preferredWeightUnit,
      preferredHydrationUnit:
        user.preferredHydrationUnit,
      dailyHydrationGoal: user.dailyHydrationGoal,
      targetWeight: user.targetWeight,
    });
  } catch (error) {
    console.error("Get dashboard summary error:", error);

    res.status(500).json({
      error: "Unable to retrieve dashboard summary.",
    });
  }
}
