import type { Response } from "express";
import prisma from "../config/prisma.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { getBodyWeightHistory } from "../services/body-weight.service.js";
import { calculateBmi } from "../utils/body-composition.js";
import {
  fromKilograms,
  roundMeasurement,
  type WeightUnit,
} from "../utils/measurements.js";

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

    const [user, bodyWeights, hydrationEntries] =
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

        getBodyWeightHistory(userId, 2),

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

    const preferredWeightUnit: WeightUnit =
      user.preferredWeightUnit === "kg" ? "kg" : "lb";
    const currentBodyWeight = bodyWeights[0] ?? null;
    const previousBodyWeight = bodyWeights[1] ?? null;

    const currentWeight = currentBodyWeight
      ? roundMeasurement(
          fromKilograms(currentBodyWeight.weightKg, preferredWeightUnit)
        )
      : null;
    const previousWeight = previousBodyWeight
      ? roundMeasurement(
          fromKilograms(previousBodyWeight.weightKg, preferredWeightUnit)
        )
      : null;

    const weightDifference =
      currentBodyWeight !== null && previousBodyWeight !== null
        ? roundMeasurement(
            fromKilograms(
              currentBodyWeight.weightKg - previousBodyWeight.weightKg,
              preferredWeightUnit
            )
          )
        : null;

    const bmi = currentBodyWeight === null
      ? null
      : calculateBmi(currentBodyWeight.weightKg, user.heightCm);
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
        currentBodyWeight?.recordedAt ?? null,
      preferredWeightUnit,
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
