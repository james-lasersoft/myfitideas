import { randomUUID } from "node:crypto";
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
import {
  calculateBodyComposition,
  calculateWaistToHeightRatio,
} from "../utils/body-composition.js";

const circumferenceFields = [
  "waist",
  "chest",
  "hips",
  "neck",
  "abdomen",
  "leftBicep",
  "rightBicep",
  "leftForearm",
  "rightForearm",
  "leftThigh",
  "rightThigh",
  "leftCalf",
  "rightCalf",
] as const;

type CircumferenceField = (typeof circumferenceFields)[number];

interface MeasurementRequestBody extends Partial<Record<CircumferenceField, number>> {
  weight?: number;
  bodyFat?: number;
  weightUnit?: WeightUnit;
  lengthUnit?: LengthUnit;
  measurementDate?: string;
  confirmAnomaly?: boolean;
}

function convertLength(value: number | undefined, unit: LengthUnit): number | undefined {
  return value === undefined ? undefined : toCentimeters(value, unit);
}

function displayLength(value: number | null, unit: LengthUnit): number | null {
  return value == null ? null : roundMeasurement(fromCentimeters(value, unit));
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
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
    const values = [body.weight, body.bodyFat, ...circumferenceFields.map((field) => body[field])];
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
    const waistCm = convertLength(body.waist, lengthUnit);
    const chestCm = convertLength(body.chest, lengthUnit);
    const hipsCm = convertLength(body.hips, lengthUnit);
    const neckCm = convertLength(body.neck, lengthUnit);
    const abdomenCm = convertLength(body.abdomen, lengthUnit);
    const leftBicepCm = convertLength(body.leftBicep, lengthUnit);
    const rightBicepCm = convertLength(body.rightBicep, lengthUnit);
    const leftForearmCm = convertLength(body.leftForearm, lengthUnit);
    const rightForearmCm = convertLength(body.rightForearm, lengthUnit);
    const leftThighCm = convertLength(body.leftThigh, lengthUnit);
    const rightThighCm = convertLength(body.rightThigh, lengthUnit);
    const leftCalfCm = convertLength(body.leftCalf, lengthUnit);
    const rightCalfCm = convertLength(body.rightCalf, lengthUnit);

    const composition = calculateBodyComposition({
      reference: user.bodyCompositionReference,
      heightCm: user.heightCm,
      weightKg,
      neckCm,
      abdomenCm,
      waistCm,
      hipsCm,
    });
    const waistHeight = calculateWaistToHeightRatio(waistCm, user.heightCm);
    const bodyFat = composition?.bodyFat ?? body.bodyFat;
    const bodyFatMethod = composition?.bodyFatMethod ?? (body.bodyFat === undefined ? undefined : "USER_PROVIDED");
    const manualFatMassKg = weightKg !== undefined && bodyFat !== undefined
      ? round(weightKg * bodyFat / 100)
      : undefined;
    const fatMassKg = composition?.fatMassKg ?? manualFatMassKg;
    const leanMassKg = composition?.leanMassKg ?? (
      weightKg !== undefined && fatMassKg !== undefined ? round(weightKg - fatMassKg) : undefined
    );

    const canonicalInput = { weightKg, waistCm, chestCm, hipsCm, bodyFat, measurementDate };
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

    const measurementSessionId = randomUUID();
    const bodyWeightId = weightKg === undefined ? null : randomUUID();

    const measurement = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "measurement_sessions" (
          "id", "userId", "recordedAt", "createdAt", "updatedAt"
        ) VALUES (
          ${measurementSessionId}, ${req.user!.id}, ${measurementDate}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `;

      if (bodyWeightId && weightKg !== undefined) {
        await tx.$executeRaw`
          INSERT INTO "body_weights" (
            "id", "userId", "measurementSessionId", "recordedAt", "weightKg", "source", "createdAt", "updatedAt"
          ) VALUES (
            ${bodyWeightId}, ${req.user!.id}, ${measurementSessionId}, ${measurementDate}, ${weightKg},
            'MEASUREMENT_SESSION'::"BodyWeightSource", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
        `;
      }

      const created = await tx.measurement.create({
        data: {
          userId: req.user!.id,
          weight: body.weight,
          waist: body.waist,
          chest: body.chest,
          hips: body.hips,
          bodyFat,
          bodyFatMethod,
          fatMassKg,
          leanMassKg,
          waistToHeightRatio: waistHeight?.value,
          waistToHeightRatioMethod: waistHeight?.method,
          weightKg,
          waistCm,
          chestCm,
          hipsCm,
          neckCm,
          abdomenCm,
          leftBicepCm,
          rightBicepCm,
          leftForearmCm,
          rightForearmCm,
          leftThighCm,
          rightThighCm,
          leftCalfCm,
          rightCalfCm,
          measurementDate,
        },
      });

      await tx.$executeRaw`
        UPDATE "measurements"
        SET "measurementSessionId" = ${measurementSessionId},
            "bodyWeightId" = ${bodyWeightId},
            "calculationWeightKg" = ${weightKg ?? null}
        WHERE "id" = ${created.id}
      `;

      return {
        ...created,
        measurementSessionId,
        bodyWeightId,
        calculationWeightKg: weightKg ?? null,
      };
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
      waist: row.waistCm == null ? row.waist : displayLength(row.waistCm, lengthUnit),
      chest: row.chestCm == null ? row.chest : displayLength(row.chestCm, lengthUnit),
      hips: row.hipsCm == null ? row.hips : displayLength(row.hipsCm, lengthUnit),
      neck: displayLength(row.neckCm, lengthUnit),
      abdomen: displayLength(row.abdomenCm, lengthUnit),
      leftBicep: displayLength(row.leftBicepCm, lengthUnit),
      rightBicep: displayLength(row.rightBicepCm, lengthUnit),
      leftForearm: displayLength(row.leftForearmCm, lengthUnit),
      rightForearm: displayLength(row.rightForearmCm, lengthUnit),
      leftThigh: displayLength(row.leftThighCm, lengthUnit),
      rightThigh: displayLength(row.rightThighCm, lengthUnit),
      leftCalf: displayLength(row.leftCalfCm, lengthUnit),
      rightCalf: displayLength(row.rightCalfCm, lengthUnit),
      fatMass: row.fatMassKg == null ? null : roundMeasurement(fromKilograms(row.fatMassKg, weightUnit)),
      leanMass: row.leanMassKg == null ? null : roundMeasurement(fromKilograms(row.leanMassKg, weightUnit)),
      displayUnits: { weight: weightUnit, length: lengthUnit },
    }));

    res.status(200).json({
      measurements,
      profileMetrics: {
        heightCm: user.heightCm,
        height: displayLength(user.heightCm, lengthUnit),
        displayUnit: lengthUnit,
        bodyCompositionReference: user.bodyCompositionReference,
        bodyCompositionReferenceBasis: user.bodyCompositionReferenceBasis,
        hasCompletedTwelveMonthsHormoneTherapy: user.hasCompletedTwelveMonthsHormoneTherapy,
      },
    });
  } catch (error) {
    console.error("Get measurements error:", error);
    res.status(500).json({ error: "Unable to retrieve measurements." });
  }
};
