import { randomUUID } from "node:crypto";
import prisma from "../config/prisma.js";
import { fromKilograms, roundMeasurement, toKilograms, type WeightUnit } from "../utils/measurements.js";

export const bodyWeightSources = [
  "MANUAL",
  "MEASUREMENT_SESSION",
  "SMART_SCALE",
  "APPLE_HEALTH",
  "HEALTH_CONNECT",
  "FITBIT",
  "GARMIN",
  "WITHINGS",
  "IMPORT",
  "SYNTHETIC",
] as const;

export type BodyWeightSource = (typeof bodyWeightSources)[number];

export interface BodyWeightRow {
  id: string;
  userId: string;
  measurementSessionId: string | null;
  recordedAt: Date;
  weightKg: number;
  source: BodyWeightSource;
  notes: string | null;
  syntheticBatchId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BodyWeightInput {
  weight: number;
  unit: WeightUnit;
  recordedAt?: string;
  source?: BodyWeightSource;
  notes?: string;
  measurementSessionId?: string;
}

function validateWeightKg(weightKg: number): void {
  if (!Number.isFinite(weightKg) || weightKg < 10 || weightKg > 635) {
    throw new RangeError("Weight must be between 10 kg and 635 kg.");
  }
}

function parseRecordedAt(value?: string): Date {
  const recordedAt = value ? new Date(value) : new Date();
  if (Number.isNaN(recordedAt.getTime())) {
    throw new TypeError("recordedAt must be a valid date and time.");
  }
  if (recordedAt.getTime() > Date.now() + 5 * 60 * 1000) {
    throw new RangeError("recordedAt cannot be in the future.");
  }
  return recordedAt;
}

function validateSource(source: string): asserts source is BodyWeightSource {
  if (!bodyWeightSources.includes(source as BodyWeightSource)) {
    throw new TypeError("Unsupported body weight source.");
  }
}

export function formatBodyWeight(row: BodyWeightRow, unit: WeightUnit) {
  return {
    ...row,
    weight: roundMeasurement(fromKilograms(row.weightKg, unit)),
    displayUnit: unit,
  };
}

export async function createBodyWeight(userId: string, input: BodyWeightInput): Promise<BodyWeightRow> {
  const source = input.source ?? "MANUAL";
  validateSource(source);
  const weightKg = toKilograms(input.weight, input.unit);
  validateWeightKg(weightKg);
  const recordedAt = parseRecordedAt(input.recordedAt);
  const id = randomUUID();
  const notes = input.notes?.trim() || null;
  const measurementSessionId = input.measurementSessionId?.trim() || null;

  const rows = await prisma.$queryRaw<BodyWeightRow[]>`
    INSERT INTO "body_weights" (
      "id", "userId", "measurementSessionId", "recordedAt", "weightKg", "source", "notes", "createdAt", "updatedAt"
    ) VALUES (
      ${id}, ${userId}, ${measurementSessionId}, ${recordedAt}, ${weightKg}, ${source}::"BodyWeightSource", ${notes}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    RETURNING *
  `;
  const row = rows[0];
  if (!row) {
    throw new Error("Body weight entry was not returned after creation.");
  }
  return row;
}

export async function getLatestBodyWeight(userId: string): Promise<BodyWeightRow | null> {
  const rows = await prisma.$queryRaw<BodyWeightRow[]>`
    SELECT * FROM "body_weights"
    WHERE "userId" = ${userId}
      AND "recordedAt" <= CURRENT_TIMESTAMP + INTERVAL '5 minutes'
    ORDER BY "recordedAt" DESC, "createdAt" DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getBodyWeightHistory(userId: string, limit = 90, offset = 0): Promise<BodyWeightRow[]> {
  return prisma.$queryRaw<BodyWeightRow[]>`
    SELECT * FROM "body_weights"
    WHERE "userId" = ${userId}
      AND "recordedAt" <= CURRENT_TIMESTAMP + INTERVAL '5 minutes'
    ORDER BY "recordedAt" DESC, "createdAt" DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
}

export async function updateBodyWeight(userId: string, id: string, input: BodyWeightInput): Promise<BodyWeightRow | null> {
  const source = input.source ?? "MANUAL";
  validateSource(source);
  const weightKg = toKilograms(input.weight, input.unit);
  validateWeightKg(weightKg);
  const recordedAt = parseRecordedAt(input.recordedAt);
  const notes = input.notes?.trim() || null;

  const rows = await prisma.$queryRaw<BodyWeightRow[]>`
    UPDATE "body_weights"
    SET "recordedAt" = ${recordedAt}, "weightKg" = ${weightKg},
        "source" = ${source}::"BodyWeightSource", "notes" = ${notes}, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${id} AND "userId" = ${userId}
    RETURNING *
  `;
  return rows[0] ?? null;
}

export async function deleteBodyWeight(userId: string, id: string): Promise<boolean> {
  const deleted = await prisma.$executeRaw`
    DELETE FROM "body_weights" WHERE "id" = ${id} AND "userId" = ${userId}
  `;
  return deleted > 0;
}
