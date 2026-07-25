import type { Response } from "express";
import prisma from "../config/prisma.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

interface MeasurementRequestBody {
  weight?: number;
  waist?: number;
  chest?: number;
  hips?: number;
  bodyFat?: number;
  measurementDate?: string;
}

export const createMeasurement = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Authentication is required." });
      return;
    }

    const {
      weight,
      waist,
      chest,
      hips,
      bodyFat,
      measurementDate,
    } = req.body as MeasurementRequestBody;

    const values = [weight, waist, chest, hips, bodyFat];

    if (values.every((value) => value === undefined)) {
      res.status(400).json({
        error: "At least one measurement value is required.",
      });
      return;
    }

    if (
      values.some(
        (value) =>
          value !== undefined &&
          (!Number.isFinite(value) || value < 0)
      )
    ) {
      res.status(400).json({
        error: "Measurement values must be valid positive numbers.",
      });
      return;
    }

    const measurement = await prisma.measurement.create({
      data: {
        userId: req.user.id,
        weight,
        waist,
        chest,
        hips,
        bodyFat,
        measurementDate: measurementDate
          ? new Date(measurementDate)
          : new Date(),
      },
    });

    res.status(201).json({
      message: "Measurement saved successfully.",
      measurement,
    });
  } catch (error) {
    console.error("Create measurement error:", error);

    res.status(500).json({
      error: "Unable to save the measurement.",
    });
  }
};

export const getMeasurements = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Authentication is required." });
      return;
    }

    const measurements = await prisma.measurement.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        measurementDate: "desc",
      },
    });

    res.status(200).json({
      measurements,
    });
  } catch (error) {
    console.error("Get measurements error:", error);

    res.status(500).json({
      error: "Unable to retrieve measurements.",
    });
  }
};
