import crypto from "node:crypto";
import type { Response } from "express";
import prisma from "../src/config/prisma.js";
import { deleteSyntheticDataBatch, generateSyntheticData } from "../src/controllers/synthetic-data.controller.js";
import type { AuthenticatedRequest } from "../src/middleware/auth.middleware.js";

jest.mock("../src/config/prisma.js", () => ({
  __esModule: true,
  default: {
    organizationMembership: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
    auditLog: { create: jest.fn() },
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  },
}));

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const batchId = "11111111-1111-4111-8111-111111111111";

function response(): Response {
  const res = { status: jest.fn(), json: jest.fn() } as unknown as Response;
  (res.status as jest.Mock).mockReturnValue(res);
  return res;
}

function request(body: Record<string, unknown> = {}, params: Record<string, string> = {}): AuthenticatedRequest {
  return { user: { id: "admin-123", email: "admin@example.com" }, body, params } as unknown as AuthenticatedRequest;
}

function textOf(call: unknown[]): string {
  return Array.from(call[0] as TemplateStringsArray).join("?").replace(/\s+/g, " ").trim();
}

describe("synthetic data batch provenance", () => {
  const savedNodeEnv = process.env.NODE_ENV;
  const savedFlag = process.env.ALLOW_SYNTHETIC_DATA_GENERATION;
  let generatedId = 1;

  beforeEach(() => {
    jest.clearAllMocks();
    generatedId = 1;
    process.env.NODE_ENV = "development";
    process.env.ALLOW_SYNTHETIC_DATA_GENERATION = "true";
    mockedPrisma.organizationMembership.findFirst.mockResolvedValue({ id: "membership-1" } as never);
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: "target-123", email: "target@example.com", firstName: "Target", lastName: "User", status: "ACTIVE",
    } as never);
    (mockedPrisma.$transaction as jest.Mock).mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) => callback(mockedPrisma)
    );
    (mockedPrisma.$executeRaw as jest.Mock).mockResolvedValue(1);
    (mockedPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ id: "session-selected" }]);
    mockedPrisma.auditLog.create.mockResolvedValue({ id: "audit-1" } as never);
    jest.spyOn(crypto, "randomUUID")
      .mockReturnValueOnce(batchId)
      .mockImplementation(() => {
        const value = `00000000-0000-4000-8000-${String(generatedId).padStart(12, "0")}`;
        generatedId += 1;
        return value as ReturnType<typeof crypto.randomUUID>;
      });
    jest.spyOn(crypto, "randomInt").mockReturnValue(12345);
  });

  afterEach(() => jest.restoreAllMocks());

  afterAll(() => {
    process.env.NODE_ENV = savedNodeEnv;
    process.env.ALLOW_SYNTHETIC_DATA_GENERATION = savedFlag;
  });

  test("creates canonical daily weights and linked weekly measurement records for one batch", async () => {
    const res = response();
    await generateSyntheticData(request({
      userId: "target-123", periodDays: 30, dailyWeight: true, weeklyMeasurements: true,
      dailyHydration: true, sexReference: "MALE", age: 35, bodyProfile: "NORMAL",
      trend: "STABLE", adherence: "PERFECT", hydrationPattern: "AVERAGE",
    }), res);

    const calls = (mockedPrisma.$executeRaw as jest.Mock).mock.calls as unknown[][];
    const batchInsert = calls.find((call) => textOf(call).includes('INSERT INTO "synthetic_data_batches"'));
    const bodyWeights = calls.filter((call) => textOf(call).includes('INSERT INTO "body_weights"'));
    const dailyWeights = bodyWeights.filter((call) => !textOf(call).includes('"measurementSessionId"'));
    const weeklyWeights = bodyWeights.filter((call) => textOf(call).includes('"measurementSessionId"'));
    const sessions = calls.filter((call) => textOf(call).includes('INSERT INTO "measurement_sessions"'));
    const measurements = calls.filter((call) => textOf(call).includes('INSERT INTO "measurements"'));
    const hydration = calls.filter((call) => textOf(call).includes('INSERT INTO "hydration"'));

    expect(batchInsert?.slice(1)).toContain(batchId);
    expect(dailyWeights).toHaveLength(30);
    expect(weeklyWeights).toHaveLength(5);
    expect(sessions).toHaveLength(5);
    expect(measurements).toHaveLength(5);
    expect(hydration).toHaveLength(120);

    for (const call of dailyWeights) {
      expect(textOf(call)).toContain("'SYNTHETIC'::\"BodyWeightSource\"");
      expect(call.slice(1)[1]).toBe("target-123");
      expect(call.slice(1)[4]).toBe(batchId);
    }

    sessions.forEach((sessionCall, index) => {
      const sessionId = sessionCall.slice(1)[0];
      const bodyWeightValues = weeklyWeights[index].slice(1);
      const measurementValues = measurements[index].slice(1);

      expect(bodyWeightValues[1]).toBe("target-123");
      expect(bodyWeightValues[2]).toBe(sessionId);
      expect(bodyWeightValues[5]).toBe(batchId);
      expect(textOf(weeklyWeights[index])).toContain("'SYNTHETIC'::\"BodyWeightSource\"");
      expect(measurementValues[1]).toBe("target-123");
      expect(measurementValues[12]).toBe(batchId);
      expect(measurementValues[13]).toBe(sessionId);
      expect(measurementValues[14]).toBe(bodyWeightValues[0]);
      expect(measurementValues[15]).toBe(bodyWeightValues[4]);
    });

    expect(hydration.every((call) => call.slice(1).includes(batchId))).toBe(true);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      batch: expect.objectContaining({
        id: batchId,
        counts: { weightEntries: 30, measurementEntries: 5, hydrationEntries: 120, total: 155 },
      }),
    }));
  });

  test("deletes only the selected batch and safely removes its unreferenced sessions", async () => {
    const res = response();
    (mockedPrisma.$queryRaw as jest.Mock).mockResolvedValue([
      { id: "session-selected" },
      { id: "session-shared" },
    ]);
    (mockedPrisma.$executeRaw as jest.Mock).mockImplementation(
      async (strings: TemplateStringsArray, ...values: unknown[]) => {
        const sql = Array.from(strings).join("?").replace(/\s+/g, " ").trim();
        if (sql.includes('DELETE FROM "measurements"')) return 2;
        if (sql.includes('DELETE FROM "body_weights"')) return 3;
        if (sql.includes('DELETE FROM "hydration"')) return 4;
        if (sql.includes('DELETE FROM "measurement_sessions"')) return values[0] === "session-selected" ? 1 : 0;
        return 1;
      }
    );

    await deleteSyntheticDataBatch(request({}, { batchId: "selected-batch" }), res);

    const queryCall = (mockedPrisma.$queryRaw as jest.Mock).mock.calls[0] as unknown[];
    const calls = (mockedPrisma.$executeRaw as jest.Mock).mock.calls as unknown[][];
    const measurementDelete = calls.find((call) => textOf(call).includes('DELETE FROM "measurements"'));
    const bodyWeightDelete = calls.find((call) => textOf(call).includes('DELETE FROM "body_weights"'));
    const hydrationDelete = calls.find((call) => textOf(call).includes('DELETE FROM "hydration"'));
    const sessionDeletes = calls.filter((call) => textOf(call).includes('DELETE FROM "measurement_sessions"'));

    expect(textOf(queryCall)).toContain('FROM "measurements"');
    expect(textOf(queryCall)).toContain('FROM "body_weights"');
    expect(queryCall.slice(1)).toEqual(["selected-batch", "selected-batch"]);
    expect((mockedPrisma.$queryRaw as jest.Mock).mock.invocationCallOrder[0])
      .toBeLessThan((mockedPrisma.$executeRaw as jest.Mock).mock.invocationCallOrder[1]);

    for (const call of [measurementDelete!, bodyWeightDelete!, hydrationDelete!]) {
      expect(textOf(call)).toContain('WHERE "syntheticBatchId" = ?');
      expect(call.slice(1)).toEqual(["selected-batch"]);
      expect(textOf(call)).not.toContain('"userId"');
      expect(textOf(call)).not.toContain('"source"');
    }

    expect(sessionDeletes).toHaveLength(2);
    for (const call of sessionDeletes) {
      expect(textOf(call)).toContain('NOT EXISTS ( SELECT 1 FROM "measurements"');
      expect(textOf(call)).toContain('NOT EXISTS ( SELECT 1 FROM "body_weights"');
    }
    expect(calls.every((call) => !call.slice(1).includes("another-batch"))).toBe(true);
    expect(mockedPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: {
          measurementCount: 2,
          bodyWeightCount: 3,
          hydrationCount: 4,
          measurementSessionCount: 1,
        },
      }),
    });
    expect(res.json).toHaveBeenCalledWith({
      deleted: {
        measurementCount: 2,
        bodyWeightCount: 3,
        hydrationCount: 4,
        measurementSessionCount: 1,
      },
    });
  });

  test("does not start partial cleanup when the batch is missing or already deleted", async () => {
    const res = response();
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    (mockedPrisma.$executeRaw as jest.Mock).mockImplementation(
      async (strings: TemplateStringsArray) =>
        Array.from(strings).join("?").includes('UPDATE "synthetic_data_batches"') ? 0 : 1
    );

    await deleteSyntheticDataBatch(request({}, { batchId: "missing-batch" }), res);

    const calls = (mockedPrisma.$executeRaw as jest.Mock).mock.calls as unknown[][];
    expect(calls).toHaveLength(1);
    expect(textOf(calls[0])).toContain('UPDATE "synthetic_data_batches"');
    expect(calls.some((call) => textOf(call).startsWith("DELETE FROM"))).toBe(false);
    expect(mockedPrisma.auditLog.create).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith("Delete synthetic data batch error:", expect.any(Error));
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
