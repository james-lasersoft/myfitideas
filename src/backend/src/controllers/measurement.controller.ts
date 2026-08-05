import type { Response } from "express";
import prisma from "../config/prisma.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  fromCentimeters,
  fromKilograms,
  roundMeasurement,
  toCentimeters,
  toKilograms,
  type LengthUnit,
  type WeightUnit,
} from "../utils/measurements.js";
import {
  compareMeasurementChange,
  validateMeasurementDate,
  validateMeasurementRanges,
} from "../utils/data-integrity.js";

interface MeasurementRequestBody {
  weight?: number;
  waist?: number;
  chest?: number;
  hips?: number;
  bodyFat?: number;
  weightUnit?: WeightUnit;
  lengthUnit?: LengthUnit;
  measurementDate?: string;
  confirmAnomaly?: boolean;
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

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      res.status(404).json({ error: "User profile not found." });
      return;
    }

    const body = req.body as MeasurementRequestBody;
    const values = [body.weight, body.waist, body.chest, body.hips, body.bodyFat];
    if (values.every((value) => value === undefined)) {
      res.status(400).json({ error: "At least one measurement value is required." });
      return;
    }
    if (values.some((value) => value !== undefined && (!Number.isFinite(value) || value <= 0))) {
      res.status(400).json({ error: "Measurement values must be valid positive numbers." });
      return;
    }

    const weightUnit = body.weightUnit ?? (user.preferredWeightUnit as WeightUnit);
    const lengthUnit = body.lengthUnit ?? (user.preferredLengthUnit as LengthUnit);
    if (!(["kg", "lb"] as string[]).includes(weightUnit) || !(["cm", "in"] as string[]).includes(lengthUnit)) {
      res.status(400).json({ error: "Unsupported measurement unit." });
      return;
    }

    const measurementDate = body.measurementDate ? new Date(body.measurementDate) : new Date();
    const dateError = validateMeasurementDate(measurementDate);
    if (dateError) {
      res.status(400).json({ error: dateError });
      return;
    }

    const weightKg = body.weight === undefined ? undefined : toKilograms(body.weight, weightUnit);
    const waistCm = body.waist === undefined ? undefined : toCentimeters(body.waist, lengthUnit);
    const chestCm = body.chest === undefined ? undefined : toCentimeters(body.chest, lengthUnit);
    const hipsCm = body.hips === undefined ? undefined : toCentimeters(body.hips, lengthUnit);
    const canonicalInput = { weightKg, waistCm, chestCm, hipsCm, bodyFat: body.bodyFat, measurementDate };
    const rangeErrors = validateMeasurementRanges(canonicalInput);
    if (rangeErrors.length) {
      res.status(400).json({ code: "MEASUREMENT_OUT_OF_RANGE", error: rangeErrors[0], details: rangeErrors });
      return;
    }

    const previous = await prisma.measurement.findFirst({
      where: { userId: req.user.id, measurementDate: { lte: measurementDate } },
      orderBy: { measurementDate: "desc" },
      select: { weightKg: true, waistCm: true, chestCm: true, hipsCm: true, bodyFat: true, measurementDate: true },
    });
    const issues = compareMeasurementChange(canonicalInput, previous);
    const requiresConfirmation = issues.some((issue) => issue.severity === "confirmation_required");
    if (requiresConfirmation && body.confirmAnomaly !== true) {
      res.status(409).json({
        code: "MEASUREMENT_CONFIRMATION_REQUIRED",
        error: "This entry differs substantially from the nearest previous measurement.",
        issues,
      });
      return;
    }

    const measurement = await prisma.measurement.create({
      data: {
        userId: req.user.id,
        weight: body.weight,
        waist: body.waist,
        chest: body.chest,
        hips: body.hips,
        bodyFat: body.bodyFat,
        weightKg,
        waistCm,
        chestCm,
        hipsCm,
        measurementDate,
      },
    });

    res.status(201).json({ message: "Measurement saved successfully.", measurement, warnings: issues });
  } catch (error) {
    console.error("Create measurement error:", error);
    res.status(500).json({ error: "Unable to save the measurement." });
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

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      res.status(404).json({ error: "User profile not found." });
      return;
    }

    const rows = await prisma.measurement.findMany({
      where: { userId: req.user.id },
      orderBy: { measurementDate: "desc" },
    });

    const weightUnit = user.preferredWeightUnit as WeightUnit;
    const lengthUnit = user.preferredLengthUnit as LengthUnit;
    const measurements = rows.map((row) => ({
      ...row,
      weight: row.weightKg == null ? row.weight : roundMeasurement(fromKilograms(row.weightKg, weightUnit)),
      waist: row.waistCm == null ? row.waist : roundMeasurement(fromCentimeters(row.waistCm, lengthUnit)),
      chest: row.chestCm == null ? row.chest : roundMeasurement(fromCentimeters(row.chestCm, lengthUnit)),
      hips: row.hipsCm == null ? row.hips : roundMeasurement(fromCentimeters(row.hipsCm, lengthUnit)),
      displayUnits: { weight: weightUnit, length: lengthUnit },
    }));

    res.status(200).json({ measurements });
  } catch (error) {
    console.error("Get measurements error:", error);
    res.status(500).json({ error: "Unable to retrieve measurements." });
  }
};
