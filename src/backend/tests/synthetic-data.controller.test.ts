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

  beforeEach(() => {
    jest.clearAllMocks();
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
    mockedPrisma.auditLog.create.mockResolvedValue({ id: "audit-1" } as never);
    jest.spyOn(crypto, "randomUUID").mockReturnValue(batchId);
    jest.spyOn(crypto, "randomInt").mockReturnValue(12345);
  });

  afterEach(() => jest.restoreAllMocks());

  afterAll(() => {
    process.env.NODE_ENV = savedNodeEnv;
    process.env.ALLOW_SYNTHETIC_DATA_GENERATION = savedFlag;
  });

  test("preserves the generated batch ID on measurement and hydration records", async () => {
    const res = response();
    await generateSyntheticData(request({
      userId: "target-123", periodDays: 30, dailyWeight: true, weeklyMeasurements: true,
      dailyHydration: true, sexReference: "MALE", age: 35, bodyProfile: "NORMAL",
      trend: "STABLE", adherence: "PERFECT", hydrationPattern: "AVERAGE",
    }), res);

    const calls = (mockedPrisma.$executeRaw as jest.Mock).mock.calls as unknown[][];
    const batchInsert = calls.find((call) => textOf(call).includes('INSERT INTO "synthetic_data_batches"'));
    const measurements = calls.filter((call) => textOf(call).includes('INSERT INTO "measurements"'));
    const hydration = calls.filter((call) => textOf(call).includes('INSERT INTO "hydration"'));

    expect(batchInsert?.slice(1)).toContain(batchId);
    expect(measurements).toHaveLength(35);
    expect(hydration).toHaveLength(120);
    expect(measurements.every((call) => call.slice(1).includes(batchId))).toBe(true);
    expect(hydration.every((call) => call.slice(1).includes(batchId))).toBe(true);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      batch: expect.objectContaining({ id: batchId }),
    }));
  });

  test("deletes only records attributed to the selected batch", async () => {
    const res = response();
    (mockedPrisma.$executeRaw as jest.Mock).mockImplementation(
      async (strings: TemplateStringsArray) =>
        Array.from(strings).join("?").includes('UPDATE "synthetic_data_batches"') ? 1 : 2
    );

    await deleteSyntheticDataBatch(request({}, { batchId: "selected-batch" }), res);

    const calls = (mockedPrisma.$executeRaw as jest.Mock).mock.calls as unknown[][];
    const deletes = calls.filter((call) => textOf(call).startsWith("DELETE FROM"));
    const measurements = deletes.find((call) => textOf(call).includes('"measurements"'));
    const hydration = deletes.find((call) => textOf(call).includes('"hydration"'));

    expect(deletes).toHaveLength(2);
    expect(textOf(measurements!)).toContain('WHERE "syntheticBatchId" = ?');
    expect(textOf(hydration!)).toContain('WHERE "syntheticBatchId" = ?');
    expect(measurements?.slice(1)).toEqual(["selected-batch"]);
    expect(hydration?.slice(1)).toEqual(["selected-batch"]);
    expect(calls.every((call) => !call.slice(1).includes("another-batch"))).toBe(true);
    expect(res.json).toHaveBeenCalledWith({ deleted: { measurementCount: 2, hydrationCount: 2 } });
  });
});
