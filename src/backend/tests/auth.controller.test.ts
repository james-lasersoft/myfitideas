import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../src/config/prisma.js";
import { getAuthorizationSnapshot } from "../src/services/authorization.service.js";
import { writeAuditLog } from "../src/services/audit.service.js";
import { login, register } from "../src/controllers/auth.controller.js";

jest.mock("../src/config/prisma.js", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
    },
    userSession: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock("../src/services/authorization.service.js", () => ({
  getAuthorizationSnapshot: jest.fn(),
}));

jest.mock("../src/services/audit.service.js", () => ({
  writeAuditLog: jest.fn(),
}));

jest.mock("bcrypt", () => ({
  __esModule: true,
  default: {
    hash: jest.fn(),
    compare: jest.fn(),
  },
}));

jest.mock("jsonwebtoken", () => ({
  __esModule: true,
  default: {
    sign: jest.fn(),
  },
}));

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockedJwt = jwt as jest.Mocked<typeof jwt>;
const mockedGetAuthorization = getAuthorizationSnapshot as jest.MockedFunction<typeof getAuthorizationSnapshot>;
const mockedWriteAuditLog = writeAuditLog as jest.MockedFunction<typeof writeAuditLog>;

describe("authentication controller", () => {
  const originalJwtSecret = process.env.JWT_SECRET;

  const createResponse = (): Response => {
    const res = {
      status: jest.fn(),
      json: jest.fn(),
    } as unknown as Response;
    (res.status as jest.Mock).mockReturnValue(res);
    return res;
  };

  const createRequest = (body: Record<string, unknown>): Request => ({
    body,
    get: jest.fn().mockReturnValue("jest-agent"),
    ip: "127.0.0.1",
  } as unknown as Request);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "unit-test-secret";
    mockedWriteAuditLog.mockResolvedValue(undefined);
  });

  afterAll(() => {
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  });

  describe("register", () => {
    test("returns 400 when required fields are missing", async () => {
      const res = createResponse();
      await register(createRequest({ email: "james@example.com", password: "Password123" }) as never, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Email, password, and first name are required.",
      });
      expect(mockedPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    test("returns 400 when the password is too short", async () => {
      const res = createResponse();
      await register(createRequest({ email: "james@example.com", password: "short", firstName: "James" }) as never, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Password must contain at least 8 characters.",
      });
    });

    test("returns 409 when the email already exists", async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({ id: "existing-user" } as never);
      const res = createResponse();

      await register(createRequest({
        email: " James@Example.com ",
        password: "Password123",
        firstName: "James",
      }) as never, res);

      expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "james@example.com" },
      });
      expect(res.status).toHaveBeenCalledWith(409);
      expect(mockedBcrypt.hash).not.toHaveBeenCalled();
    });

    test("returns 503 when RBAC bootstrap records are unavailable", async () => {
      mockedPrisma.user.findUnique.mockResolvedValue(null);
      mockedPrisma.organization.findUnique.mockResolvedValue(null);
      const res = createResponse();

      await register(createRequest({
        email: "james@example.com",
        password: "Password123",
        firstName: "James",
      }) as never, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        error: "Account registration is temporarily unavailable.",
      });
    });

    test("creates a free user membership and role assignment", async () => {
      mockedPrisma.user.findUnique.mockResolvedValue(null);
      mockedPrisma.organization.findUnique.mockResolvedValue({ id: "org-1" } as never);
      mockedPrisma.role.findUnique.mockResolvedValue({ id: "role-free" } as never);
      mockedBcrypt.hash.mockResolvedValue("hashed-password" as never);

      const createdUser = {
        id: "user-123",
        email: "james@example.com",
        firstName: "James",
        lastName: "Arnold",
        createdAt: new Date("2026-07-19"),
      };

      mockedPrisma.$transaction.mockImplementation(async (callback: unknown) => {
        const tx = {
          user: { create: jest.fn().mockResolvedValue(createdUser) },
          organizationMembership: { create: jest.fn().mockResolvedValue({ id: "membership-1" }) },
          membershipRole: { create: jest.fn().mockResolvedValue({}) },
        };
        return (callback as (client: typeof tx) => Promise<unknown>)(tx);
      });

      const res = createResponse();
      await register(createRequest({
        email: " James@Example.com ",
        password: "Password123",
        firstName: " James ",
        lastName: " Arnold ",
      }) as never, res);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith("Password123", 12);
      expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockedWriteAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        organizationId: "org-1",
        actorUserId: "user-123",
        action: "USER_REGISTERED",
      }));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "User registered successfully.",
        user: createdUser,
      });
    });
  });

  describe("login", () => {
    test("returns 400 when email or password is missing", async () => {
      const res = createResponse();
      await login(createRequest({ email: "james@example.com" }) as never, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("returns 401 when credentials are invalid", async () => {
      mockedPrisma.user.findUnique.mockResolvedValue(null);
      const res = createResponse();
      await login(createRequest({ email: "missing@example.com", password: "Password123" }) as never, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });

    test("returns 403 when the account is inactive", async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({
        id: "user-123",
        email: "james@example.com",
        passwordHash: "stored-hash",
        status: "SUSPENDED",
      } as never);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      const res = createResponse();

      await login(createRequest({ email: "james@example.com", password: "Password123" }) as never, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockedWriteAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: "LOGIN_DENIED",
        result: "DENIED",
      }));
    });

    test("creates a revocable session and returns authorization", async () => {
      const user = {
        id: "user-123",
        email: "james@example.com",
        passwordHash: "stored-hash",
        firstName: "James",
        lastName: "Arnold",
        status: "ACTIVE",
        tokenVersion: 0,
        mustChangePassword: false,
      };
      const authorization = {
        organizationId: "org-1",
        organizationName: "MyFitIdeas",
        membershipId: "membership-1",
        roles: ["super-administrator"],
        permissions: ["admin.access"],
      };

      mockedPrisma.user.findUnique.mockResolvedValue(user as never);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockedJwt.sign.mockReturnValue("mock-jwt-token" as never);
      mockedPrisma.userSession.create.mockReturnValue({} as never);
      mockedPrisma.user.update.mockReturnValue({} as never);
      mockedPrisma.$transaction.mockResolvedValue([] as never);
      mockedGetAuthorization.mockResolvedValue(authorization);

      const res = createResponse();
      await login(createRequest({ email: " James@Example.com ", password: "Password123" }) as never, res);

      expect(mockedJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: "user-123",
          email: "james@example.com",
          tokenVersion: 0,
          sessionId: expect.any(String),
        }),
        "unit-test-secret",
        { expiresIn: "1h" }
      );
      expect(mockedPrisma.userSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-123",
          tokenHash: expect.any(String),
          userAgent: "jest-agent",
          ipAddress: "127.0.0.1",
          expiresAt: expect.any(Date),
        }),
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Login successful.",
        token: "mock-jwt-token",
        user: {
          id: "user-123",
          email: "james@example.com",
          firstName: "James",
          lastName: "Arnold",
          mustChangePassword: false,
        },
        authorization,
      });
    });
  });
});
