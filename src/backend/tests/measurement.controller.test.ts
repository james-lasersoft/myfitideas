import type { Response } from "express";

import prisma from "../src/config/prisma.js";
import {
  createMeasurement,
  getMeasurements,
} from "../src/controllers/measurement.controller.js";
import type { AuthenticatedRequest } from "../src/middleware/auth.middleware.js";

jest.mock("../src/config/prisma.js", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    measurement: {
      create: jest.fn(),
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
  heightCm: 187,
  preferredWeightUnit: "lb",
  preferredLengthUnit: "in",
  preferredHydrationUnit: "oz",
  preferredLanguage: "en-US",
  timeZone: "America/Chicago",
  dailyHydrationGoal: 64,
  dailyHydrationGoalMl: 1892.705892,
  targetWeight: 200,
  targetWeightKg: 90.718474,
  createdAt: new Date("2026-07-01"),
  updatedAt: new Date("2026-07-01"),
};

describe("measurement controller", () => {
  const createResponse = (): Response => {
    const res = {
      status: jest.fn(),
      json: jest.fn(),
    } as unknown as Response;

    (res.status as jest.Mock).mockReturnValue(res);

    return res;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue(mockUser as never);
  });

  describe("createMeasurement", () => {
    test("returns 401 when the user is not authenticated", async () => {
      const req = {
        body: {
          weight: 220,
        },
      } as AuthenticatedRequest;

      const res = createResponse();

      await createMeasurement(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authentication is required.",
      });

      expect(mockedPrisma.user.findUnique).not.toHaveBeenCalled();
      expect(mockedPrisma.measurement.create).not.toHaveBeenCalled();
    });

    test("returns 400 when no measurement value is provided", async () => {
      const req = {
        user: {
          id: "user-123",
          email: "james@example.com",
        },
        body: {},
      } as AuthenticatedRequest;

      const res = createResponse();

      await createMeasurement(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "At least one measurement value is required.",
      });

      expect(mockedPrisma.measurement.create).not.toHaveBeenCalled();
    });

    test("returns 400 when a measurement is negative", async () => {
      const req = {
        user: {
          id: "user-123",
          email: "james@example.com",
        },
        body: {
          weight: -10,
        },
      } as AuthenticatedRequest;

      const res = createResponse();

      await createMeasurement(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Measurement values must be valid positive numbers.",
      });

      expect(mockedPrisma.measurement.create).not.toHaveBeenCalled();
    });

    test("stores imperial input in canonical metric fields", async () => {
      const savedMeasurement = {
        id: "measurement-001",
        userId: "user-123",
        weight: 220,
        waist: 40,
        chest: null,
        hips: null,
        bodyFat: 24,
        weightKg: 99.7903214,
        waistCm: 101.6,
        chestCm: null,
        hipsCm: null,
        measurementDate: new Date("2026-07-19"),
        createdAt: new Date("2026-07-19"),
        updatedAt: new Date("2026-07-19"),
      };

      mockedPrisma.measurement.create.mockResolvedValue(
        savedMeasurement as never
      );

      const req = {
        user: {
          id: "user-123",
          email: "james@example.com",
        },
        body: {
          weight: 220,
          waist: 40,
          bodyFat: 24,
          measurementDate: "2026-07-19",
        },
      } as AuthenticatedRequest;

      const res = createResponse();

      await createMeasurement(req, res);

      expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-123" },
      });
      expect(mockedPrisma.measurement.create).toHaveBeenCalledWith({
        data: {
          userId: "user-123",
          weight: 220,
          waist: 40,
          chest: undefined,
          hips: undefined,
          bodyFat: 24,
          weightKg: 99.7903214,
          waistCm: 101.6,
          chestCm: undefined,
          hipsCm: undefined,
          measurementDate: new Date("2026-07-19"),
        },
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Measurement saved successfully.",
        measurement: savedMeasurement,
      });
    });

    test("accepts explicit metric units", async () => {
      mockedPrisma.measurement.create.mockResolvedValue({ id: "metric-001" } as never);

      const req = {
        user: {
          id: "user-123",
          email: "james@example.com",
        },
        body: {
          weight: 90,
          waist: 100,
          weightUnit: "kg",
          lengthUnit: "cm",
        },
      } as AuthenticatedRequest;

      const res = createResponse();

      await createMeasurement(req, res);

      expect(mockedPrisma.measurement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          weightKg: 90,
          waistCm: 100,
        }),
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe("getMeasurements", () => {
    test("returns canonical values converted to the user's preferred units", async () => {
      const rows = [
        {
          id: "measurement-002",
          userId: "user-123",
          weight: 218,
          waist: 39,
          chest: null,
          hips: null,
          bodyFat: 23,
          weightKg: 98.88313666,
          waistCm: 99.06,
          chestCm: null,
          hipsCm: null,
          measurementDate: new Date("2026-07-19"),
          createdAt: new Date("2026-07-19"),
          updatedAt: new Date("2026-07-19"),
        },
      ];

      mockedPrisma.measurement.findMany.mockResolvedValue(rows as never);

      const req = {
        user: {
          id: "user-123",
          email: "james@example.com",
        },
        body: {},
      } as AuthenticatedRequest;

      const res = createResponse();

      await getMeasurements(req, res);

      expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-123" },
      });
      expect(mockedPrisma.measurement.findMany).toHaveBeenCalledWith({
        where: {
          userId: "user-123",
        },
        orderBy: {
          measurementDate: "desc",
        },
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        measurements: [
          expect.objectContaining({
            id: "measurement-002",
            weight: 218,
            waist: 39,
            displayUnits: {
              weight: "lb",
              length: "in",
            },
          }),
        ],
      });
    });
  });
});
