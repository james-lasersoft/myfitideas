import type { Response } from "express";

import prisma from "../src/config/prisma.js";
import { createMeasurement, getMeasurements } from "../src/controllers/measurement.controller.js";
import type { AuthenticatedRequest } from "../src/middleware/auth.middleware.js";

jest.mock("../src/config/prisma.js", () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
    measurement: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

const mockUser = {
  id: "user-123",
  email: "james@example.com",
  passwordHash: "hash",
  firstName: "James",
  lastName: "Arnold",
  heightCm: 180,
  bodyCompositionReference: "MALE",
  bodyCompositionReferenceBasis: "BIRTH_SEX",
  hasCompletedTwelveMonthsHormoneTherapy: false,
  preferredWeightUnit: "lb",
  preferredLengthUnit: "in",
  preferredHydrationUnit: "oz",
  preferredLanguage: "en-US",
  dailyHydrationGoal: 64,
  dailyHydrationGoalMl: 1892.705892,
  targetWeight: 200,
  targetWeightKg: 90.718474,
  createdAt: new Date("2026-07-01"),
  updatedAt: new Date("2026-07-01"),
};

function createResponse(): Response {
  const res = { status: jest.fn(), json: jest.fn() } as unknown as Response;
  (res.status as jest.Mock).mockReturnValue(res);
  return res;
}

function authenticatedRequest(body: Record<string, unknown>): AuthenticatedRequest {
  return {
    user: { id: "user-123", email: "james@example.com" },
    body,
  } as AuthenticatedRequest;
}

describe("measurement controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue(mockUser as never);
    mockedPrisma.measurement.findFirst.mockResolvedValue(null);
  });

  test("requires authentication", async () => {
    const res = createResponse();
    await createMeasurement({ body: { weight: 220 } } as AuthenticatedRequest, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("requires at least one positive measurement", async () => {
    const emptyRes = createResponse();
    await createMeasurement(authenticatedRequest({}), emptyRes);
    expect(emptyRes.status).toHaveBeenCalledWith(400);

    const negativeRes = createResponse();
    await createMeasurement(authenticatedRequest({ neck: -1 }), negativeRes);
    expect(negativeRes.status).toHaveBeenCalledWith(400);
  });

  test("stores expanded imperial measurements and calculated history", async () => {
    mockedPrisma.measurement.create.mockResolvedValue({ id: "measurement-001" } as never);
    const res = createResponse();

    await createMeasurement(authenticatedRequest({
      weight: 198.4,
      waist: 39.37,
      neck: 15.75,
      abdomen: 39.37,
      leftBicep: 14,
      rightBicep: 14.2,
      measurementDate: "2026-07-19",
    }), res);

    expect(mockedPrisma.measurement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-123",
        weightKg: expect.closeTo(90, 1),
        waistCm: expect.closeTo(100, 1),
        neckCm: expect.closeTo(40, 1),
        abdomenCm: expect.closeTo(100, 1),
        leftBicepCm: expect.closeTo(35.56, 2),
        rightBicepCm: expect.closeTo(36.068, 2),
        bodyFat: expect.closeTo(25.3, 1),
        bodyFatMethod: "US_NAVY_CIRCUMFERENCE",
        fatMassKg: expect.any(Number),
        leanMassKg: expect.any(Number),
        waistToHeightRatio: 0.5556,
        waistToHeightRatioMethod: "WAIST_CM_DIVIDED_BY_HEIGHT_CM",
      }),
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("preserves a user-provided body fat method when calculation inputs are incomplete", async () => {
    mockedPrisma.measurement.create.mockResolvedValue({ id: "manual-001" } as never);
    const res = createResponse();

    await createMeasurement(authenticatedRequest({ weight: 200, bodyFat: 24 }), res);

    expect(mockedPrisma.measurement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ bodyFat: 24, bodyFatMethod: "USER_PROVIDED" }),
    });
  });

  test("returns expanded values, composition metrics, and profile metadata", async () => {
    mockedPrisma.measurement.findMany.mockResolvedValue([{
      id: "measurement-002",
      userId: "user-123",
      weight: null,
      waist: null,
      chest: null,
      hips: null,
      weightKg: 90,
      waistCm: 100,
      chestCm: 105,
      hipsCm: 102,
      neckCm: 40,
      abdomenCm: 100,
      leftBicepCm: 35,
      rightBicepCm: 36,
      leftForearmCm: 29,
      rightForearmCm: 29.5,
      leftThighCm: 60,
      rightThighCm: 61,
      leftCalfCm: 39,
      rightCalfCm: 39.5,
      bodyFat: 25.3,
      bodyFatMethod: "US_NAVY_CIRCUMFERENCE",
      fatMassKg: 22.77,
      leanMassKg: 67.23,
      waistToHeightRatio: 0.5556,
      waistToHeightRatioMethod: "WAIST_CM_DIVIDED_BY_HEIGHT_CM",
      measurementDate: new Date("2026-07-19"),
      createdAt: new Date("2026-07-19"),
      updatedAt: new Date("2026-07-19"),
    }] as never);

    const res = createResponse();
    await getMeasurements(authenticatedRequest({}), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      measurements: [expect.objectContaining({
        id: "measurement-002",
        weight: expect.closeTo(198.42, 2),
        waist: expect.closeTo(39.37, 2),
        neck: expect.closeTo(15.75, 2),
        fatMass: expect.any(Number),
        leanMass: expect.any(Number),
        bodyFatMethod: "US_NAVY_CIRCUMFERENCE",
        waistToHeightRatioMethod: "WAIST_CM_DIVIDED_BY_HEIGHT_CM",
        displayUnits: { weight: "lb", length: "in" },
      })],
      profileMetrics: {
        heightCm: 180,
        height: expect.closeTo(70.87, 2),
        displayUnit: "in",
        bodyCompositionReference: "MALE",
        bodyCompositionReferenceBasis: "BIRTH_SEX",
        hasCompletedTwelveMonthsHormoneTherapy: false,
      },
    });
  });
});
