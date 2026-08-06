import type { Response } from "express";
import prisma from "../config/prisma.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import type { WeightUnit } from "../utils/measurements.js";
import {
  createBodyWeight,
  deleteBodyWeight,
  formatBodyWeight,
  getBodyWeightHistory,
  getLatestBodyWeight,
  updateBodyWeight,
  type BodyWeightInput,
} from "../services/body-weight.service.js";

async function resolveWeightUnit(userId: string): Promise<WeightUnit> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferredWeightUnit: true },
  });
  return user?.preferredWeightUnit === "kg" ? "kg" : "lb";
}

function parseInput(req: AuthenticatedRequest): BodyWeightInput {
  const body = req.body as Partial<BodyWeightInput>;
  return {
    weight: Number(body.weight),
    unit: body.unit === "kg" ? "kg" : "lb",
    recordedAt: body.recordedAt,
    source: body.source,
    notes: body.notes,
    measurementSessionId: body.measurementSessionId,
  };
}

function routeId(req: AuthenticatedRequest): string {
  const value = req.params.id;
  return Array.isArray(value) ? value[0] : value;
}

function handleError(res: Response, error: unknown): void {
  if (error instanceof RangeError || error instanceof TypeError) {
    res.status(400).json({ error: error.message });
    return;
  }
  console.error("Body weight error:", error);
  res.status(500).json({ error: "Unable to process body weight data." });
}

export async function createWeight(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Authentication is required." });
      return;
    }
    const row = await createBodyWeight(req.user.id, parseInput(req));
    const unit = await resolveWeightUnit(req.user.id);
    res.status(201).json({ weight: formatBodyWeight(row, unit) });
  } catch (error) {
    handleError(res, error);
  }
}

export async function latestWeight(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Authentication is required." });
      return;
    }
    const [row, unit] = await Promise.all([
      getLatestBodyWeight(req.user.id),
      resolveWeightUnit(req.user.id),
    ]);
    res.status(200).json({ weight: row ? formatBodyWeight(row, unit) : null });
  } catch (error) {
    handleError(res, error);
  }
}

export async function weightHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Authentication is required." });
      return;
    }
    const requestedLimit = Number(req.query.limit ?? 90);
    const requestedOffset = Number(req.query.offset ?? 0);
    const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 365) : 90;
    const offset = Number.isInteger(requestedOffset) ? Math.max(requestedOffset, 0) : 0;
    const [rows, unit] = await Promise.all([
      getBodyWeightHistory(req.user.id, limit, offset),
      resolveWeightUnit(req.user.id),
    ]);
    res.status(200).json({
      weights: rows.map((row) => formatBodyWeight(row, unit)),
      pagination: { limit, offset, returned: rows.length },
    });
  } catch (error) {
    handleError(res, error);
  }
}

export async function updateWeight(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Authentication is required." });
      return;
    }
    const row = await updateBodyWeight(req.user.id, routeId(req), parseInput(req));
    if (!row) {
      res.status(404).json({ error: "Body weight entry not found." });
      return;
    }
    const unit = await resolveWeightUnit(req.user.id);
    res.status(200).json({ weight: formatBodyWeight(row, unit) });
  } catch (error) {
    handleError(res, error);
  }
}

export async function removeWeight(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Authentication is required." });
      return;
    }
    const deleted = await deleteBodyWeight(req.user.id, routeId(req));
    if (!deleted) {
      res.status(404).json({ error: "Body weight entry not found." });
      return;
    }
    res.status(204).send();
  } catch (error) {
    handleError(res, error);
  }
}
