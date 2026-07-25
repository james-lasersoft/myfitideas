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
    measurement: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

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

    test("saves a valid measurement and returns 201", async () => {
      const savedMeasurement = {
        id: "measurement-001",
        userId: "user-123",
        weight: 220,
        waist: 40,
        chest: null,
        hips: null,
        bodyFat: 24,
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

      expect(mockedPrisma.measurement.create).toHaveBeenCalledWith({
        data: {
          userId: "user-123",
          weight: 220,
          waist: 40,
          chest: undefined,
          hips: undefined,
          bodyFat: 24,
          measurementDate: new Date("2026-07-19"),
        },
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Measurement saved successfully.",
        measurement: savedMeasurement,
      });
    });
  });

  describe("getMeasurements", () => {
    test("returns measurements belonging to the authenticated user", async () => {
      const measurements = [
        {
          id: "measurement-002",
          userId: "user-123",
          weight: 218,
          measurementDate: new Date("2026-07-19"),
        },
        {
          id: "measurement-001",
          userId: "user-123",
          weight: 220,
          measurementDate: new Date("2026-07-12"),
        },
      ];

      mockedPrisma.measurement.findMany.mockResolvedValue(
        measurements as never
      );

      const req = {
        user: {
          id: "user-123",
          email: "james@example.com",
        },
        body: {},
      } as AuthenticatedRequest;

      const res = createResponse();

      await getMeasurements(req, res);

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
        measurements,
      });
    });
  });
});
