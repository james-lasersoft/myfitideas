import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  ANALYTICS_PERIODS,
  getBodyTransformationAnalytics,
  type AnalyticsPeriod,
  type AnalyticsPeriodType,
} from "../services/body-transformation-analytics.service.js";

export type AnalyticsRequestErrorCode =
  | "INVALID_ANALYTICS_PERIOD"
  | "ANALYTICS_DATE_RANGE_REQUIRED"
  | "INVALID_ANALYTICS_DATE_RANGE";

export class AnalyticsRequestError extends Error {
  constructor(public readonly code: AnalyticsRequestErrorCode) {
    super(code);
  }
}

const DAY_MS = 86_400_000;
const presetDays: Partial<Record<AnalyticsPeriodType, number>> = {
  LAST_7_DAYS: 7,
  LAST_30_DAYS: 30,
  LAST_90_DAYS: 90,
};

function dateOnly(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export function resolveAnalyticsPeriod(query: Record<string, unknown>, now = new Date()): AnalyticsPeriod {
  const requested = typeof query.period === "string" ? query.period : "LAST_30_DAYS";
  if (!ANALYTICS_PERIODS.includes(requested as AnalyticsPeriodType)) {
    throw new AnalyticsRequestError("INVALID_ANALYTICS_PERIOD");
  }
  const type = requested as AnalyticsPeriodType;
  if (type === "ALL_HISTORY") return { type, startDate: null, endDate: now };
  if (type === "CUSTOM") {
    const startValue = dateOnly(query.startDate);
    const endValue = dateOnly(query.endDate);
    if (!startValue || !endValue) throw new AnalyticsRequestError("ANALYTICS_DATE_RANGE_REQUIRED");
    const startDate = new Date(`${startValue}T00:00:00.000Z`);
    const requestedEnd = new Date(`${endValue}T23:59:59.999Z`);
    const today = now.toISOString().slice(0, 10);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(requestedEnd.getTime()) || startDate > requestedEnd || endValue > today) {
      throw new AnalyticsRequestError("INVALID_ANALYTICS_DATE_RANGE");
    }
    return { type, startDate, endDate: endValue === today ? now : requestedEnd };
  }
  return { type, startDate: new Date(now.getTime() - presetDays[type]! * DAY_MS), endDate: now };
}

export async function getBodyTransformation(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ code: "AUTHENTICATION_REQUIRED" });
    return;
  }
  try {
    const period = resolveAnalyticsPeriod(req.query as Record<string, unknown>);
    res.status(200).json(await getBodyTransformationAnalytics(req.user.id, period));
  } catch (error) {
    if (error instanceof AnalyticsRequestError) {
      res.status(400).json({ code: error.code });
      return;
    }
    console.error("Body transformation analytics error:", error);
    res.status(500).json({ code: "BODY_TRANSFORMATION_ANALYTICS_FAILED" });
  }
}
