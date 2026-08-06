import type { Response } from "express";
import prisma from "../src/config/prisma.js";
import { compareMeasurements } from "../src/controllers/measurement-comparison.controller.js";
import type { AuthenticatedRequest } from "../src/middleware/auth.middleware.js";
import {
  buildMeasurementSessionComparison,
  compareMeasurementSessions,
  compareMeasurementValues,
  MeasurementComparisonError,
} from "../src/services/measurement-comparison.service.js";

jest.mock("../src/config/prisma.js", () => ({
  __esModule: true,
  default: { measurement: { findMany: jest.fn() } },
}));
const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: "baseline",
    userId: "user-123",
    measurementDate: new Date("2026-07-01T12:00:00.000Z"),
    neckCm: 40,
    chestCm: 100,
    waistCm: 90,
    abdomenCm: 92,
    hipsCm: 101,
    leftBicepCm: 34,
    rightBicepCm: 35,
    leftForearmCm: 28,
    rightForearmCm: 29,
    leftThighCm: 58,
    rightThighCm: 59,
    leftCalfCm: 38,
    rightCalfCm: 39,
    bodyFat: 20,
    bodyFatMethod: "US_NAVY_CIRCUMFERENCE",
    waistToHeightRatio: 0.5,
    waistToHeightRatioMethod: "WAIST_CM_DIVIDED_BY_HEIGHT_CM",
    fatMassKg: 18,
    leanMassKg: 72,
    ...overrides,
  };
}
function response(): Response {
  const res = { status: jest.fn(), json: jest.fn() } as unknown as Response;
  (res.status as jest.Mock).mockReturnValue(res);
  return res;
}

describe("measurement comparison service", () => {
  beforeEach(() => jest.clearAllMocks());

  test("normalizes mixed compatible units before calculating changes", () => {
    const length = compareMeasurementValues(
      { value: 40, unit: "in" },
      { value: 106.6, unit: "cm" },
      "cm"
    );
    expect(length.baselineValue).toBe(101.6);
    expect(length.absoluteChange).toBe(5);
    expect(length.percentageChange).toBeCloseTo(4.9213, 4);

    const weight = compareMeasurementValues(
      { value: 220.462262, unit: "lb" },
      { value: 105, unit: "kg" },
      "kg"
    );
    expect(weight.baselineValue).toBeCloseTo(100, 3);
    expect(weight.absoluteChange).toBeCloseTo(5, 3);
  });

  test.each([
    [null, null, "MISSING_BOTH"],
    [null, 10, "MISSING_BASELINE"],
    [10, null, "MISSING_COMPARISON"],
  ])("returns explicit missing status for %p and %p", (baseline, comparison, status) => {
    expect(compareMeasurementValues(
      { value: baseline, unit: "cm" },
      { value: comparison, unit: "cm" },
      "cm"
    )).toEqual(expect.objectContaining({ status, absoluteChange: null, percentageChange: null }));
  });

  test("returns an absolute change but no percentage for a zero baseline", () => {
    expect(compareMeasurementValues(
      { value: 0, unit: "percent" },
      { value: 4, unit: "percent" },
      "percent"
    )).toEqual({
      baselineValue: 0,
      comparisonValue: 4,
      displayUnit: "percent",
      absoluteChange: 4,
      percentageChange: null,
      status: "ZERO_BASELINE",
    });
  });

  test("builds core, paired, and calculated comparisons with deterministic changes", () => {
    const result = buildMeasurementSessionComparison(
      session() as never,
      session({
        id: "comparison",
        measurementDate: new Date("2026-08-01T12:00:00.000Z"),
        waistCm: 85,
        leftBicepCm: 36,
        rightBicepCm: null,
        bodyFat: 18,
        fatMassKg: 17,
        leanMassKg: 78,
      }) as never
    );
    expect(result.coreMeasurements).toHaveLength(5);
    expect(result.pairedMeasurements).toHaveLength(4);
    expect(result.calculatedMetrics).toHaveLength(4);
    expect(result.coreMeasurements.find(({ field }) => field === "waist")?.value)
      .toEqual(expect.objectContaining({ absoluteChange: -5, percentageChange: -5.5556, status: "COMPARABLE" }));
    expect(result.pairedMeasurements[0]?.left.absoluteChange).toBe(2);
    expect(result.pairedMeasurements[0]?.right.status).toBe("MISSING_COMPARISON");
    expect(result.calculatedMetrics.find(({ field }) => field === "bodyFat")?.value.absoluteChange).toBe(-2);
  });

  test("rejects identical session IDs before querying storage", async () => {
    await expect(compareMeasurementSessions("user-123", "same", "same"))
      .rejects.toEqual(expect.objectContaining<Partial<MeasurementComparisonError>>({
        code: "IDENTICAL_MEASUREMENT_SESSION_IDS",
        statusCode: 400,
      }));
    expect(mockedPrisma.measurement.findMany).not.toHaveBeenCalled();
  });

  test("does not expose missing or another user's session", async () => {
    mockedPrisma.measurement.findMany.mockResolvedValue([session()] as never);
    await expect(compareMeasurementSessions("user-123", "baseline", "other-user-session"))
      .rejects.toEqual(expect.objectContaining({ code: "MEASUREMENT_SESSION_NOT_FOUND", statusCode: 404 }));
    expect(mockedPrisma.measurement.findMany).toHaveBeenCalledWith({
      where: { userId: "user-123", id: { in: ["baseline", "other-user-session"] } },
    });
  });

  test("compares two sessions owned by the authenticated user", async () => {
    mockedPrisma.measurement.findMany.mockResolvedValue([
      session(),
      session({ id: "comparison", measurementDate: new Date("2026-08-01"), waistCm: 95 }),
    ] as never);
    const result = await compareMeasurementSessions("user-123", "baseline", "comparison");
    expect(result.baselineSession.id).toBe("baseline");
    expect(result.comparisonSession.id).toBe("comparison");
  });
});

describe("measurement comparison controller", () => {
  test("requires authentication", async () => {
    const res = response();
    await compareMeasurements({ query: {} } as AuthenticatedRequest, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ code: "AUTHENTICATION_REQUIRED" });
  });

  test("returns the backend-owned comparison response", async () => {
    mockedPrisma.measurement.findMany.mockResolvedValue([
      session(),
      session({ id: "comparison", measurementDate: new Date("2026-08-01"), waistCm: 95 }),
    ] as never);
    const res = response();
    await compareMeasurements({
      user: { id: "user-123", email: "user@example.com" },
      query: { baselineSessionId: "baseline", comparisonSessionId: "comparison" },
    } as unknown as AuthenticatedRequest, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      baselineSession: expect.objectContaining({ id: "baseline" }),
      comparisonSession: expect.objectContaining({ id: "comparison" }),
      coreMeasurements: expect.any(Array),
    }));
  });

  test("requires both session IDs", async () => {
    const res = response();
    await compareMeasurements({
      user: { id: "user-123", email: "user@example.com" },
      query: { baselineSessionId: "baseline" },
    } as unknown as AuthenticatedRequest, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ code: "MEASUREMENT_COMPARISON_IDS_REQUIRED" });
  });
});
