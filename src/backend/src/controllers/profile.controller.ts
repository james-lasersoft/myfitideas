import type { Response } from "express";
import prisma from "../config/prisma.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

const WEIGHT_UNITS = ["lb", "kg"] as const;
const HYDRATION_UNITS = ["oz", "ml"] as const;

type WeightUnit = (typeof WEIGHT_UNITS)[number];
type HydrationUnit = (typeof HYDRATION_UNITS)[number];

interface UpdateProfileRequestBody {
  firstName?: string;
  lastName?: string | null;
  heightCm?: number | null;
  preferredWeightUnit?: WeightUnit;
  preferredHydrationUnit?: HydrationUnit;
  dailyHydrationGoal?: number;
  targetWeight?: number | null;
}

function isWeightUnit(value: string): value is WeightUnit {
  return WEIGHT_UNITS.includes(value as WeightUnit);
}

function isHydrationUnit(
  value: string
): value is HydrationUnit {
  return HYDRATION_UNITS.includes(value as HydrationUnit);
}

export async function getProfile(
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

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        heightCm: true,
        preferredWeightUnit: true,
        preferredHydrationUnit: true,
        dailyHydrationGoal: true,
        targetWeight: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({
        error: "User profile not found.",
      });
      return;
    }

    res.status(200).json({
      profile: user,
    });
  } catch (error) {
    console.error("Get profile error:", error);

    res.status(500).json({
      error: "Unable to retrieve the user profile.",
    });
  }
}

export async function updateProfile(
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

    const {
      firstName,
      lastName,
      heightCm,
      preferredWeightUnit,
      preferredHydrationUnit,
      dailyHydrationGoal,
      targetWeight,
    } = req.body as UpdateProfileRequestBody;

    if (
      firstName !== undefined &&
      firstName.trim().length === 0
    ) {
      res.status(400).json({
        error: "First name cannot be empty.",
      });
      return;
    }

    if (
      heightCm !== undefined &&
      heightCm !== null &&
      (!Number.isFinite(heightCm) ||
        heightCm < 50 ||
        heightCm > 300)
    ) {
      res.status(400).json({
        error: "Height must be between 50 and 300 centimeters.",
      });
      return;
    }

    if (
      preferredWeightUnit !== undefined &&
      !isWeightUnit(preferredWeightUnit)
    ) {
      res.status(400).json({
        error: "Preferred weight unit must be lb or kg.",
      });
      return;
    }

    if (
      preferredHydrationUnit !== undefined &&
      !isHydrationUnit(preferredHydrationUnit)
    ) {
      res.status(400).json({
        error: "Preferred hydration unit must be oz or ml.",
      });
      return;
    }

    if (
      dailyHydrationGoal !== undefined &&
      (!Number.isFinite(dailyHydrationGoal) ||
        dailyHydrationGoal <= 0)
    ) {
      res.status(400).json({
        error: "Daily hydration goal must be greater than zero.",
      });
      return;
    }

    if (
      targetWeight !== undefined &&
      targetWeight !== null &&
      (!Number.isFinite(targetWeight) ||
        targetWeight <= 0)
    ) {
      res.status(400).json({
        error: "Target weight must be greater than zero.",
      });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        ...(firstName !== undefined
          ? { firstName: firstName.trim() }
          : {}),
        ...(lastName !== undefined
          ? {
              lastName:
                lastName === null || lastName.trim() === ""
                  ? null
                  : lastName.trim(),
            }
          : {}),
        ...(heightCm !== undefined ? { heightCm } : {}),
        ...(preferredWeightUnit !== undefined
          ? { preferredWeightUnit }
          : {}),
        ...(preferredHydrationUnit !== undefined
          ? { preferredHydrationUnit }
          : {}),
        ...(dailyHydrationGoal !== undefined
          ? { dailyHydrationGoal }
          : {}),
        ...(targetWeight !== undefined
          ? { targetWeight }
          : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        heightCm: true,
        preferredWeightUnit: true,
        preferredHydrationUnit: true,
        dailyHydrationGoal: true,
        targetWeight: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      message: "Profile updated successfully.",
      profile: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);

    res.status(500).json({
      error: "Unable to update the user profile.",
    });
  }
}
