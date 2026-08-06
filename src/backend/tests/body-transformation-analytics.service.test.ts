import type { Response } from "express";
import prisma from "../src/config/prisma.js";
import { getBodyTransformation, resolveAnalyticsPeriod } from "../src/controllers/body-transformation-analytics.controller.js";
import type { AuthenticatedRequest } from "../src/middleware/auth.middleware.js";
import {
  buildBodyTransformationAnalytics,
  buildBodyTransformationTrend,
  getBodyTransformationAnalytics,
} from "../src/services/body-transformation-analytics.service.js";

jest.mock("../src/config/prisma.js", () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
    measurement: { findMany: jest.fn() },
    $queryRaw: jest.fn(),
  },
}));
const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const now = new Date("2026-08-06T12:00:00.000Z");
const period = { type: "LAST_30_DAYS" as const, startDate: new Date("2026-07-07T12:00:00.000Z"), endDate: now };

function measurement(date: string, overrides: Record<string, unknown> = {}) {
  return {
    measurementDate: new Date(date), neckCm: 40, chestCm: 100, waistCm: 90, hipsCm: 101,
    leftBicepCm: 34, rightBicepCm: 35, leftThighCm: 58, rightThighCm: 59, leftCalfCm: 38, rightCalfCm: 39,
    bodyFat: 20, bodyFatMethod: "US_NAVY_CIRCUMFERENCE", waistToHeightRatio: 0.5,
    waistToHeightRatioMethod: "WAIST_CM_DIVIDED_BY_HEIGHT_CM", fatMassKg: 18, leanMassKg: 72, ...overrides,
  };
}
function response(): Response {
  const res = { status: jest.fn(), json: jest.fn() } as unknown as Response;
  (res.status as jest.Mock).mockReturnValue(res);
  return res;
}

describe("body transformation trend rules", () => {
  test("returns unavailable with no observations and current-only with one", () => {
    expect(buildBodyTransformationTrend([], "cm")).toEqual(expect.objectContaining({
      observationCount: 0, startValue: null, endValue: null, direction: "INSUFFICIENT_DATA", reliability: "UNAVAILABLE",
    }));
    expect(buildBodyTransformationTrend([{ recordedAt: now, value: 80, unitCode: "kg" }], "kg")).toEqual(expect.objectContaining({
      observationCount: 1, startValue: 80, endValue: 80, absoluteChange: null, reliability: "CURRENT_ONLY",
    }));
  });

  test("normalizes mixed units and reports a basic two-point change", () => {
    const trend = buildBodyTransformationTrend([
      { recordedAt: new Date("2026-07-01"), value: 40, unitCode: "in" },
      { recordedAt: new Date("2026-08-01"), value: 106.6, unitCode: "cm" },
    ], "cm");
    expect(trend).toEqual(expect.objectContaining({
      startValue: 101.6, endValue: 106.6, absoluteChange: 5, direction: "INCREASING", reliability: "BASIC_CHANGE",
    }));
    expect(trend.percentageChange).toBeCloseTo(4.9213, 4);
  });

  test("classifies increasing, decreasing, stable, zero-baseline, and trend-eligible values", () => {
    const observations = (values: number[]) => values.map((value, index) => ({
      recordedAt: new Date(Date.UTC(2026, 6, index + 1)), value, unitCode: "percent" as const,
    }));
    expect(buildBodyTransformationTrend(observations([1, 2]), "percent").direction).toBe("INCREASING");
    expect(buildBodyTransformationTrend(observations([2, 1]), "percent").direction).toBe("DECREASING");
    expect(buildBodyTransformationTrend(observations([2, 2]), "percent").direction).toBe("STABLE");
    expect(buildBodyTransformationTrend(observations([0, 2]), "percent").percentageChange).toBeNull();
    expect(buildBodyTransformationTrend(observations([1, 2, 3]), "percent").reliability).toBe("TREND_ELIGIBLE");
  });
});

describe("body transformation analytics model", () => {
  test("keeps skipped and paired measurements independent and reports deterministic consistency", () => {
    const result = buildBodyTransformationAnalytics(period,
      [{ recordedAt: new Date("2026-07-10"), weightKg: 80 }, { recordedAt: new Date("2026-07-11"), weightKg: 79 }],
      [
        measurement("2026-07-10", { rightBicepCm: null }),
        measurement("2026-07-24", { waistCm: null, leftBicepCm: 36, rightBicepCm: 37 }),
      ] as never,
      { weight: "kg", length: "cm" });
    expect(result.weight.absoluteChange).toBe(-1);
    expect(result.coreMeasurements.find(({ field }) => field === "waist")?.trend.reliability).toBe("CURRENT_ONLY");
    const arms = result.pairedMeasurements.find(({ field }) => field === "upperArms")!;
    expect(arms.left.absoluteChange).toBe(2);
    expect(arms.right.reliability).toBe("CURRENT_ONLY");
    expect(result.consistency.bodyWeight).toEqual(expect.objectContaining({ observationCount: 2, coveredIntervalCount: 2, intervalUnit: "DAY" }));
    expect(result.consistency.measurementSessions.intervalUnit).toBe("WEEK");
  });

  test("returns BMI only when profile height supports the existing domain calculation", () => {
    const result = buildBodyTransformationAnalytics(period, [
      { recordedAt: new Date("2026-07-10"), weightKg: 81 },
      { recordedAt: new Date("2026-07-24"), weightKg: 77.76 },
    ], [], { weight: "kg", length: "cm", heightCm: 180 });
    expect(result.calculatedMetrics.find(({ field }) => field === "bmi")?.trend)
      .toEqual(expect.objectContaining({ startValue: 25, endValue: 24, absoluteChange: -1 }));
    const unavailable = buildBodyTransformationAnalytics(period, [
      { recordedAt: new Date("2026-07-10"), weightKg: 81 },
    ], [], { weight: "kg", length: "cm" });
    expect(unavailable.calculatedMetrics.find(({ field }) => field === "bmi")?.trend.reliability).toBe("UNAVAILABLE");
  });

  test("only exposes derived composition trends with validated calculation metadata", () => {
    const result = buildBodyTransformationAnalytics(period, [], [
      measurement("2026-07-10", { bodyFat: 20, bodyFatMethod: null, fatMassKg: 18, leanMassKg: 72 }),
      measurement("2026-07-24", { bodyFat: 18, bodyFatMethod: "US_NAVY_CIRCUMFERENCE", fatMassKg: 16, leanMassKg: 74 }),
    ] as never, { weight: "kg", length: "cm" });
    expect(result.calculatedMetrics.find(({ field }) => field === "bodyFat")?.trend.reliability).toBe("CURRENT_ONLY");
    expect(result.calculatedMetrics.find(({ field }) => field === "fatMass")?.trend.reliability).toBe("CURRENT_ONLY");
  });
});

describe("body transformation analytics periods and authorization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ preferredWeightUnit: "kg", preferredLengthUnit: "cm", heightCm: 180 } as never);
    mockedPrisma.$queryRaw.mockResolvedValue([] as never);
    mockedPrisma.measurement.findMany.mockResolvedValue([] as never);
  });

  test.each([
    ["LAST_7_DAYS", 7], ["LAST_30_DAYS", 30], ["LAST_90_DAYS", 90],
  ])("resolves %s as a rolling period", (value, days) => {
    const result = resolveAnalyticsPeriod({ period: value }, now);
    expect(result.endDate).toEqual(now);
    expect(result.startDate?.getTime()).toBe(now.getTime() - days * 86_400_000);
  });

  test("supports all history and validates custom ranges", () => {
    expect(resolveAnalyticsPeriod({ period: "ALL_HISTORY" }, now).startDate).toBeNull();
    expect(resolveAnalyticsPeriod({ period: "CUSTOM", startDate: "2026-07-01", endDate: "2026-07-31" }, now))
      .toEqual(expect.objectContaining({ type: "CUSTOM", startDate: new Date("2026-07-01T00:00:00.000Z"), endDate: new Date("2026-07-31T23:59:59.999Z") }));
    expect(() => resolveAnalyticsPeriod({ period: "CUSTOM", startDate: "2026-08-02" }, now))
      .toThrow(expect.objectContaining({ code: "ANALYTICS_DATE_RANGE_REQUIRED" }));
    expect(() => resolveAnalyticsPeriod({ period: "CUSTOM", startDate: "2026-08-07", endDate: "2026-08-08" }, now))
      .toThrow(expect.objectContaining({ code: "INVALID_ANALYTICS_DATE_RANGE" }));
    expect(() => resolveAnalyticsPeriod({ period: "INVALID" }, now))
      .toThrow(expect.objectContaining({ code: "INVALID_ANALYTICS_PERIOD" }));
  });

  test("scopes both data sources to the authenticated user and period", async () => {
    await getBodyTransformationAnalytics("user-123", period);
    expect(mockedPrisma.measurement.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "user-123", measurementDate: { gte: period.startDate, lte: period.endDate } },
    }));
    const queryInvocation = mockedPrisma.$queryRaw.mock.calls[0] as unknown[];
    expect(String((queryInvocation[0] as { strings?: string[] }).strings ?? queryInvocation[0])).toContain('"userId" =');
    expect(queryInvocation).toContain("user-123");
  });

  test("requires authentication", async () => {
    const res = response();
    await getBodyTransformation({ query: {} } as AuthenticatedRequest, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ code: "AUTHENTICATION_REQUIRED" });
  });

  test("returns stable validation errors and the authenticated user's response", async () => {
    const invalid = response();
    await getBodyTransformation({ user: { id: "user-123", email: "u@example.com" }, query: { period: "INVALID" } } as unknown as AuthenticatedRequest, invalid);
    expect(invalid.status).toHaveBeenCalledWith(400);
    expect(invalid.json).toHaveBeenCalledWith({ code: "INVALID_ANALYTICS_PERIOD" });

    const valid = response();
    await getBodyTransformation({ user: { id: "user-123", email: "u@example.com" }, query: {} } as unknown as AuthenticatedRequest, valid);
    expect(valid.status).toHaveBeenCalledWith(200);
    expect(valid.json).toHaveBeenCalledWith(expect.objectContaining({ dataSufficiency: expect.any(Object) }));
  });
});
