import jwt from "jsonwebtoken";
import type { NextFunction, Response } from "express";
import prisma from "../src/config/prisma.js";
import {
  authenticateToken,
  type AuthenticatedRequest,
} from "../src/middleware/auth.middleware.js";

jest.mock("../src/config/prisma.js", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    userSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

describe("authenticateToken middleware", () => {
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "unit-test-secret";
  });

  afterAll(() => {
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
  });

  const createResponse = (): Response => {
    const res = {
      status: jest.fn(),
      json: jest.fn(),
    } as unknown as Response;

    (res.status as jest.Mock).mockReturnValue(res);
    return res;
  };

  test("returns 401 when the authorization header is missing", async () => {
    const req = { headers: {} } as AuthenticatedRequest;
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Authentication token is required.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("returns 401 when the Bearer token is invalid", async () => {
    const req = {
      headers: { authorization: "Bearer invalid-token" },
    } as AuthenticatedRequest;
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid or expired authentication token.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("adds the authenticated user and calls next for a valid legacy token", async () => {
    const token = jwt.sign(
      {
        sub: "user-123",
        email: "james@example.com",
        tokenVersion: 0,
      },
      "unit-test-secret",
      { expiresIn: "1h" }
    );

    mockedPrisma.user.findUnique.mockResolvedValue({
      id: "user-123",
      email: "james@example.com",
      status: "ACTIVE",
      tokenVersion: 0,
    } as never);

    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as AuthenticatedRequest;
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    await authenticateToken(req, res, next);

    expect(req.user).toEqual({
      id: "user-123",
      email: "james@example.com",
      sessionId: undefined,
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test("rejects a token when the user token version has changed", async () => {
    const token = jwt.sign(
      {
        sub: "user-123",
        email: "james@example.com",
        tokenVersion: 0,
      },
      "unit-test-secret",
      { expiresIn: "1h" }
    );

    mockedPrisma.user.findUnique.mockResolvedValue({
      id: "user-123",
      email: "james@example.com",
      status: "ACTIVE",
      tokenVersion: 1,
    } as never);

    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as AuthenticatedRequest;
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "This session is no longer active.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("returns 500 when JWT_SECRET is not configured", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    delete process.env.JWT_SECRET;

    const req = {
      headers: { authorization: "Bearer some-token" },
    } as AuthenticatedRequest;
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Authentication configuration error.",
    });
    expect(next).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith("JWT_SECRET is not defined.");

    consoleErrorSpy.mockRestore();
  });
});
