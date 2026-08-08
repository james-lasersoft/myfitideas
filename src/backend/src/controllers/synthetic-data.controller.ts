import crypto from "node:crypto";
import type { Response } from "express";
import prisma from "../config/prisma.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

const allowedPeriods = new Set([30, 60, 90]);
const allowedProfiles = new Set(["UNDERWEIGHT", "NORMAL", "OVERWEIGHT", "OBESITY", "ATHLETIC"]);
const allowedSexReferences = new Set(["MALE", "FEMALE"]);
const allowedTrends = new Set(["STABLE", "LOSS", "GAIN", "RECOMPOSITION", "IRREGULAR"]);
const allowedAdherence = new Set(["PERFECT", "REALISTIC", "CHAOTIC"]);
const allowedHydrationPatterns = new Set(["HIGH", "AVERAGE", "LOW", "WEEKEND"]);

type GeneratorInput = {
  userId: string;
  periodDays: 30 | 60 | 90;
  dailyWeight: boolean;
  weeklyMeasurements: boolean;
  dailyHydration: boolean;
  sexReference: "MALE" | "FEMALE";
  age: number;
  bodyProfile: "UNDERWEIGHT" | "NORMAL" | "OVERWEIGHT" | "OBESITY" | "ATHLETIC";
  trend: "STABLE" | "LOSS" | "GAIN" | "RECOMPOSITION" | "IRREGULAR";
  adherence: "PERFECT" | "REALISTIC" | "CHAOTIC";
  hydrationPattern: "HIGH" | "AVERAGE" | "LOW" | "WEEKEND";
};

function syntheticDataEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.ALLOW_SYNTHETIC_DATA_GENERATION === "true";
}

async function isSuperAdministrator(userId: string): Promise<boolean> {
  const membership = await prisma.organizationMembership.findFirst({
    where: { userId, status: "ACTIVE", roles: { some: { role: { key: "super-administrator", isActive: true } } } },
    select: { id: true },
  });
  return Boolean(membership);
}

async function authorize(req: AuthenticatedRequest, res: Response): Promise<boolean> {
  if (!req.user) {
    res.status(401).json({ error: "Authentication is required." });
    return false;
  }
  if (!syntheticDataEnabled()) {
    res.status(403).json({ error: "Synthetic data generation is disabled for this environment." });
    return false;
  }
  if (!(await isSuperAdministrator(req.user.id))) {
    res.status(403).json({ error: "Super administrator access is required." });
    return false;
  }
  return true;
}

function validateInput(body: Record<string, unknown>): GeneratorInput | string {
  const input = body as Partial<GeneratorInput>;
  if (typeof input.userId !== "string" || !input.userId) return "A target user is required.";
  if (typeof input.periodDays !== "number" || !allowedPeriods.has(input.periodDays)) return "The simulation period must be 30, 60, or 90 days.";
  if (typeof input.age !== "number" || !Number.isInteger(input.age) || input.age < 18 || input.age > 90) return "The simulated age must be between 18 and 90.";
  if (typeof input.bodyProfile !== "string" || !allowedProfiles.has(input.bodyProfile)) return "The body profile is invalid.";
  if (typeof input.sexReference !== "string" || !allowedSexReferences.has(input.sexReference)) return "The sex reference is invalid.";
  if (typeof input.trend !== "string" || !allowedTrends.has(input.trend)) return "The trend is invalid.";
  if (typeof input.adherence !== "string" || !allowedAdherence.has(input.adherence)) return "The adherence pattern is invalid.";
  if (typeof input.hydrationPattern !== "string" || !allowedHydrationPatterns.has(input.hydrationPattern)) return "The hydration pattern is invalid.";
  if (![input.dailyWeight, input.weeklyMeasurements, input.dailyHydration].some((value) => value === true)) return "Select at least one data set to generate.";
  return input as GeneratorInput;
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = value + Math.imul(value ^ (value >>> 7), 61 | value) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function baseWeightKg(profile: GeneratorInput["bodyProfile"], sex: GeneratorInput["sexReference"]): number {
  const base = { UNDERWEIGHT: 54, NORMAL: 72, OVERWEIGHT: 94, OBESITY: 122, ATHLETIC: 78 }[profile];
  return base + (sex === "MALE" ? 8 : -3);
}

function trendDeltaKg(trend: GeneratorInput["trend"], progress: number): number {
  if (trend === "LOSS") return -6 * progress;
  if (trend === "GAIN") return 4.5 * progress;
  if (trend === "RECOMPOSITION") return -1.5 * progress;
  if (trend === "IRREGULAR") return Math.sin(progress * 11) * 1.8;
  return 0;
}

function estimatedCounts(input: GeneratorInput) {
  const perDay = input.hydrationPattern === "HIGH" ? 6 : input.hydrationPattern === "LOW" ? 3 : 4;
  const adherenceMultiplier = input.adherence === "PERFECT" ? 1 : input.adherence === "REALISTIC" ? 0.9 : 0.72;
  const weightEntries = input.dailyWeight ? Math.round(input.periodDays * adherenceMultiplier) : 0;
  const measurementEntries = input.weeklyMeasurements ? Math.round(Math.ceil(input.periodDays / 7) * adherenceMultiplier) : 0;
  const hydrationEntries = input.dailyHydration ? Math.round(input.periodDays * perDay * adherenceMultiplier) : 0;
  return { weightEntries, measurementEntries, hydrationEntries, total: weightEntries + measurementEntries + hydrationEntries };
}

async function activeUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, lastName: true, status: true },
  });
}

export async function listSyntheticDataUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!(await authorize(req, res))) return;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const users = await prisma.user.findMany({
      where: { status: "ACTIVE", ...(search ? { OR: [{ email: { contains: search, mode: "insensitive" } }, { firstName: { contains: search, mode: "insensitive" } }, { lastName: { contains: search, mode: "insensitive" } }] } : {}) },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }, { email: "asc" }],
      take: 100,
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    res.json({ users });
  } catch (error) {
    console.error("List synthetic data users error:", error);
    res.status(500).json({ error: "Unable to retrieve users for synthetic data generation." });
  }
}

export async function previewSyntheticData(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!(await authorize(req, res))) return;
    const input = validateInput(req.body as Record<string, unknown>);
    if (typeof input === "string") {
      res.status(400).json({ error: input });
      return;
    }
    const user = await activeUser(input.userId);
    if (!user || user.status !== "ACTIVE") {
      res.status(404).json({ error: "The selected active user was not found." });
      return;
    }
    res.json({ targetUser: user, periodDays: input.periodDays, scenario: input, estimatedRecords: estimatedCounts(input), generationEnabled: true });
  } catch (error) {
    console.error("Preview synthetic data error:", error);
    res.status(500).json({ error: "Unable to preview synthetic data generation." });
  }
}

export async function generateSyntheticData(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!(await authorize(req, res)) || !req.user) return;
    const input = validateInput(req.body as Record<string, unknown>);
    if (typeof input === "string") {
      res.status(400).json({ error: input });
      return;
    }
    const user = await activeUser(input.userId);
    if (!user || user.status !== "ACTIVE") {
      res.status(404).json({ error: "The selected active user was not found." });
      return;
    }

    const batchId = crypto.randomUUID();
    const seed = crypto.randomInt(1, 2147483646);
    const random = mulberry32(seed);
    const counts = { weightEntries: 0, measurementEntries: 0, hydrationEntries: 0, total: 0 };
    const start = new Date();
    start.setUTCHours(12, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - input.periodDays + 1);
    const startingWeightKg = baseWeightKg(input.bodyProfile, input.sexReference);
    const adherenceChance = input.adherence === "PERFECT" ? 1 : input.adherence === "REALISTIC" ? 0.9 : 0.72;

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "synthetic_data_batches" (
          "id", "targetUserId", "createdByUserId", "seed", "periodDays", "sexReference",
          "simulatedAge", "bodyProfile", "trend", "adherence", "hydrationPattern",
          "dataTypes", "recordCounts", "status"
        ) VALUES (
          ${batchId}, ${input.userId}, ${req.user!.id}, ${seed}, ${input.periodDays},
          ${input.sexReference}, ${input.age}, ${input.bodyProfile}, ${input.trend}, ${input.adherence},
          ${input.hydrationPattern}, ${JSON.stringify({ dailyWeight: input.dailyWeight, weeklyMeasurements: input.weeklyMeasurements, dailyHydration: input.dailyHydration })}::jsonb,
          ${JSON.stringify(counts)}::jsonb, 'GENERATING'
        )`;

      for (let day = 0; day < input.periodDays; day += 1) {
        const date = new Date(start);
        date.setUTCDate(start.getUTCDate() + day);
        const progress = day / (input.periodDays - 1);
        const weightKg = Math.max(40, startingWeightKg + trendDeltaKg(input.trend, progress) + (random() - 0.5) * 1.4);

        if (input.dailyWeight && random() <= adherenceChance) {
          await tx.$executeRaw`
            INSERT INTO "body_weights" (
              "id", "userId", "recordedAt", "weightKg", "source", "syntheticBatchId", "createdAt", "updatedAt"
            ) VALUES (
              ${crypto.randomUUID()}, ${input.userId}, ${date}, ${weightKg},
              'SYNTHETIC'::"BodyWeightSource", ${batchId}, NOW(), NOW()
            )`;
          counts.weightEntries += 1;
        }

        if (input.weeklyMeasurements && day % 7 === 0 && random() <= adherenceChance) {
          const profileWaist = { UNDERWEIGHT: 70, NORMAL: 82, OVERWEIGHT: 101, OBESITY: 122, ATHLETIC: 76 }[input.bodyProfile];
          const waistCm = profileWaist + trendDeltaKg(input.trend, progress) * 0.8 + (random() - 0.5) * 1.5;
          const chestCm = waistCm + (input.sexReference === "MALE" ? 18 : 10) + (random() - 0.5) * 2;
          const hipsCm = waistCm + (input.sexReference === "FEMALE" ? 14 : 5) + (random() - 0.5) * 2;
          const bodyFat = { UNDERWEIGHT: 13, NORMAL: 22, OVERWEIGHT: 31, OBESITY: 39, ATHLETIC: 14 }[input.bodyProfile] + (input.sexReference === "FEMALE" ? 7 : 0) + trendDeltaKg(input.trend, progress) * 0.35;
          const measurementSessionId = crypto.randomUUID();
          const bodyWeightId = crypto.randomUUID();
          const measurementId = crypto.randomUUID();

          await tx.$executeRaw`
            INSERT INTO "measurement_sessions" (
              "id", "userId", "recordedAt", "createdAt", "updatedAt"
            ) VALUES (
              ${measurementSessionId}, ${input.userId}, ${date}, NOW(), NOW()
            )`;
          await tx.$executeRaw`
            INSERT INTO "body_weights" (
              "id", "userId", "measurementSessionId", "recordedAt", "weightKg", "source",
              "syntheticBatchId", "createdAt", "updatedAt"
            ) VALUES (
              ${bodyWeightId}, ${input.userId}, ${measurementSessionId}, ${date}, ${weightKg},
              'SYNTHETIC'::"BodyWeightSource", ${batchId}, NOW(), NOW()
            )`;
          await tx.$executeRaw`
            INSERT INTO "measurements" (
              "id", "userId", "measurementDate", "weight", "weightKg", "waist", "waistCm", "chest", "chestCm",
              "hips", "hipsCm", "bodyFat", "syntheticBatchId", "measurementSessionId", "bodyWeightId",
              "calculationWeightKg", "createdAt", "updatedAt"
            ) VALUES (
              ${measurementId}, ${input.userId}, ${date}, ${weightKg * 2.2046226218}, ${weightKg},
              ${waistCm / 2.54}, ${waistCm}, ${chestCm / 2.54}, ${chestCm}, ${hipsCm / 2.54}, ${hipsCm},
              ${bodyFat}, ${batchId}, ${measurementSessionId}, ${bodyWeightId}, ${weightKg}, NOW(), NOW()
            )`;
          counts.measurementEntries += 1;
        }

        if (input.dailyHydration && random() <= adherenceChance) {
          let entries = input.hydrationPattern === "HIGH" ? 6 : input.hydrationPattern === "LOW" ? 3 : 4;
          if (input.hydrationPattern === "WEEKEND" && [0, 6].includes(date.getUTCDay())) entries = 3;
          for (let index = 0; index < entries; index += 1) {
            const loggedAt = new Date(date);
            loggedAt.setUTCHours(7 + index * Math.floor(12 / Math.max(entries, 1)), Math.floor(random() * 45), 0, 0);
            const beverageType = index === entries - 1 && random() > 0.65 ? "coffee" : "water";
            const coefficient = beverageType === "water" ? 1 : 0.8;
            const amountMl = Math.round(250 + random() * 250);
            await tx.$executeRaw`
              INSERT INTO "hydration" (
                "id", "userId", "amount", "unit", "loggedAt", "amountMl", "beverageType",
                "hydrationCoefficient", "effectiveAmountMl", "syntheticBatchId", "createdAt", "updatedAt"
              ) VALUES (
                ${crypto.randomUUID()}, ${input.userId}, ${amountMl / 29.5735295625}, 'oz', ${loggedAt},
                ${amountMl}, ${beverageType}, ${coefficient}, ${amountMl * coefficient}, ${batchId}, NOW(), NOW()
              )`;
            counts.hydrationEntries += 1;
          }
        }
      }

      counts.total = counts.weightEntries + counts.measurementEntries + counts.hydrationEntries;
      await tx.$executeRaw`
        UPDATE "synthetic_data_batches"
        SET "recordCounts" = ${JSON.stringify(counts)}::jsonb, "status" = 'COMPLETED'
        WHERE "id" = ${batchId}`;
      await tx.auditLog.create({
        data: {
          actorUserId: req.user!.id,
          action: "synthetic_data.generate",
          targetType: "SyntheticDataBatch",
          targetId: batchId,
          result: "SUCCESS",
          metadata: { targetUserId: input.userId, seed, counts, scenario: input },
        },
      });
    });

    res.status(201).json({ batch: { id: batchId, seed, targetUser: user, counts, createdAt: new Date().toISOString() } });
  } catch (error) {
    console.error("Generate synthetic data error:", error);
    res.status(500).json({ error: "Unable to generate synthetic data." });
  }
}

export async function listSyntheticDataBatches(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!(await authorize(req, res))) return;
    const batches = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT b.*, u.email, u."firstName", u."lastName"
      FROM "synthetic_data_batches" b
      JOIN "users" u ON u.id = b."targetUserId"
      WHERE b."deletedAt" IS NULL
      ORDER BY b."createdAt" DESC
      LIMIT 50`;
    res.json({ batches });
  } catch (error) {
    console.error("List synthetic data batches error:", error);
    res.status(500).json({ error: "Unable to retrieve synthetic data batches." });
  }
}

export async function deleteSyntheticDataBatch(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!(await authorize(req, res)) || !req.user) return;
    const rawBatchId = req.params.batchId;
    const batchId = Array.isArray(rawBatchId) ? rawBatchId[0] : rawBatchId;
    if (!batchId) {
      res.status(400).json({ error: "A batch ID is required." });
      return;
    }
    const deleted = await prisma.$transaction(async (tx) => {
      const sessionRows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT DISTINCT "measurementSessionId" AS "id"
        FROM (
          SELECT "measurementSessionId"
          FROM "measurements"
          WHERE "syntheticBatchId" = ${batchId} AND "measurementSessionId" IS NOT NULL
          UNION
          SELECT "measurementSessionId"
          FROM "body_weights"
          WHERE "syntheticBatchId" = ${batchId} AND "measurementSessionId" IS NOT NULL
        ) AS "selectedSessions"`;

      const batchCount = await tx.$executeRaw`
        UPDATE "synthetic_data_batches" SET "status" = 'DELETED', "deletedAt" = NOW()
        WHERE "id" = ${batchId} AND "deletedAt" IS NULL`;
      if (batchCount === 0) throw new Error("Batch not found");

      const measurementCount = await tx.$executeRaw`
        DELETE FROM "measurements" WHERE "syntheticBatchId" = ${batchId}`;
      const bodyWeightCount = await tx.$executeRaw`
        DELETE FROM "body_weights" WHERE "syntheticBatchId" = ${batchId}`;
      const hydrationCount = await tx.$executeRaw`
        DELETE FROM "hydration" WHERE "syntheticBatchId" = ${batchId}`;

      let measurementSessionCount = 0;
      for (const { id } of sessionRows) {
        measurementSessionCount += await tx.$executeRaw`
          DELETE FROM "measurement_sessions" AS "session"
          WHERE "session"."id" = ${id}
            AND NOT EXISTS (
              SELECT 1 FROM "measurements"
              WHERE "measurementSessionId" = "session"."id"
            )
            AND NOT EXISTS (
              SELECT 1 FROM "body_weights"
              WHERE "measurementSessionId" = "session"."id"
            )`;
      }

      await tx.auditLog.create({
        data: {
          actorUserId: req.user!.id,
          action: "synthetic_data.delete",
          targetType: "SyntheticDataBatch",
          targetId: batchId,
          result: "SUCCESS",
          metadata: { measurementCount, bodyWeightCount, hydrationCount, measurementSessionCount },
        },
      });
      return { measurementCount, bodyWeightCount, hydrationCount, measurementSessionCount };
    });
    res.json({ deleted });
  } catch (error) {
    console.error("Delete synthetic data batch error:", error);
    res.status(404).json({ error: "Synthetic data batch was not found or could not be deleted." });
  }
}
