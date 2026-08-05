import type { Response } from "express";
import prisma from "../config/prisma.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

const allowedPeriods = new Set([30, 60, 90]);
const allowedProfiles = new Set(["UNDERWEIGHT", "NORMAL", "OVERWEIGHT", "OBESITY", "ATHLETIC"]);
const allowedSexReferences = new Set(["MALE", "FEMALE"]);
const allowedTrends = new Set(["STABLE", "LOSS", "GAIN", "RECOMPOSITION", "IRREGULAR"]);

function syntheticDataEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.ALLOW_SYNTHETIC_DATA_GENERATION === "true";
}

async function isSuperAdministrator(userId: string): Promise<boolean> {
  const membership = await prisma.organizationMembership.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      roles: { some: { role: { key: "super-administrator", isActive: true } } },
    },
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

export async function listSyntheticDataUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!(await authorize(req, res))) return;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const users = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        ...(search
          ? {
              OR: [
                { email: { contains: search, mode: "insensitive" } },
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
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
    const {
      userId,
      periodDays,
      dailyWeight,
      weeklyMeasurements,
      dailyHydration,
      sexReference,
      age,
      bodyProfile,
      trend,
    } = req.body as Record<string, unknown>;

    if (typeof userId !== "string" || !userId) {
      res.status(400).json({ error: "A target user is required." });
      return;
    }
    if (typeof periodDays !== "number" || !allowedPeriods.has(periodDays)) {
      res.status(400).json({ error: "The simulation period must be 30, 60, or 90 days." });
      return;
    }
    if (typeof age !== "number" || !Number.isInteger(age) || age < 18 || age > 90) {
      res.status(400).json({ error: "The simulated age must be between 18 and 90." });
      return;
    }
    if (typeof bodyProfile !== "string" || !allowedProfiles.has(bodyProfile)) {
      res.status(400).json({ error: "The body profile is invalid." });
      return;
    }
    if (typeof sexReference !== "string" || !allowedSexReferences.has(sexReference)) {
      res.status(400).json({ error: "The sex reference is invalid." });
      return;
    }
    if (typeof trend !== "string" || !allowedTrends.has(trend)) {
      res.status(400).json({ error: "The trend is invalid." });
      return;
    }
    if (![dailyWeight, weeklyMeasurements, dailyHydration].some((value) => value === true)) {
      res.status(400).json({ error: "Select at least one data set to generate." });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, status: true },
    });
    if (!user || user.status !== "ACTIVE") {
      res.status(404).json({ error: "The selected active user was not found." });
      return;
    }

    const weightEntries = dailyWeight === true ? periodDays : 0;
    const measurementEntries = weeklyMeasurements === true ? Math.ceil(periodDays / 7) : 0;
    const hydrationEntries = dailyHydration === true ? periodDays * 4 : 0;

    res.json({
      targetUser: user,
      periodDays,
      scenario: { sexReference, age, bodyProfile, trend },
      estimatedRecords: {
        weightEntries,
        measurementEntries,
        hydrationEntries,
        total: weightEntries + measurementEntries + hydrationEntries,
      },
      generationEnabled: false,
      nextStep: "Batch persistence and deterministic record generation are not enabled yet.",
    });
  } catch (error) {
    console.error("Preview synthetic data error:", error);
    res.status(500).json({ error: "Unable to preview synthetic data generation." });
  }
}
