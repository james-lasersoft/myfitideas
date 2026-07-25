import type { Request, Response } from "express";

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../src/config/prisma.js";
import {
  login,
  register,
} from "../src/controllers/auth.controller.js";

jest.mock("../src/config/prisma.js", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
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

  describe("register", () => {
    test("returns 400 when required fields are missing", async () => {
      const req = {
        body: {
          email: "james@example.com",
          password: "Password123",
        },
      } as Request;

      const res = createResponse();

      await register(req as never, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Email, password, and first name are required.",
      });

      expect(mockedPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    test("returns 400 when the password is too short", async () => {
      const req = {
        body: {
          email: "james@example.com",
          password: "short",
          firstName: "James",
        },
      } as Request;

      const res = createResponse();

      await register(req as never, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Password must contain at least 8 characters.",
      });

      expect(mockedPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    test("returns 409 when the email already exists", async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({
        id: "existing-user",
        email: "james@example.com",
      } as never);

      const req = {
        body: {
          email: " James@Example.com ",
          password: "Password123",
          firstName: "James",
        },
      } as Request;

      const res = createResponse();

      await register(req as never, res);

      expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          email: "james@example.com",
        },
      });

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: "An account with that email already exists.",
      });

      expect(mockedBcrypt.hash).not.toHaveBeenCalled();
      expect(mockedPrisma.user.create).not.toHaveBeenCalled();
    });

    test("hashes the password and creates a new user", async () => {
      mockedPrisma.user.findUnique.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue("hashed-password" as never);

      const createdUser = {
        id: "user-123",
        email: "james@example.com",
        firstName: "James",
        lastName: "Arnold",
        createdAt: new Date("2026-07-19"),
      };

      mockedPrisma.user.create.mockResolvedValue(createdUser as never);

      const req = {
        body: {
          email: " James@Example.com ",
          password: "Password123",
          firstName: " James ",
          lastName: " Arnold ",
        },
      } as Request;

      const res = createResponse();

      await register(req as never, res);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(
        "Password123",
        12
      );

      expect(mockedPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: "james@example.com",
          passwordHash: "hashed-password",
          firstName: "James",
          lastName: "Arnold",
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true,
        },
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "User registered successfully.",
        user: createdUser,
      });
    });
  });

  describe("login", () => {
    test("returns 400 when email or password is missing", async () => {
      const req = {
        body: {
          email: "james@example.com",
        },
      } as Request;

      const res = createResponse();

      await login(req as never, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Email and password are required.",
      });
    });

    test("returns 401 when the user does not exist", async () => {
      mockedPrisma.user.findUnique.mockResolvedValue(null);

      const req = {
        body: {
          email: "missing@example.com",
          password: "Password123",
        },
      } as Request;

      const res = createResponse();

      await login(req as never, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Invalid email or password.",
      });

      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });

    test("returns 401 when the password is incorrect", async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({
        id: "user-123",
        email: "james@example.com",
        passwordHash: "stored-hash",
        firstName: "James",
        lastName: "Arnold",
      } as never);

      mockedBcrypt.compare.mockResolvedValue(false as never);

      const req = {
        body: {
          email: "james@example.com",
          password: "WrongPassword",
        },
      } as Request;

      const res = createResponse();

      await login(req as never, res);

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        "WrongPassword",
        "stored-hash"
      );

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Invalid email or password.",
      });

      expect(mockedJwt.sign).not.toHaveBeenCalled();
    });

    test("returns a JWT token when login succeeds", async () => {
      const user = {
        id: "user-123",
        email: "james@example.com",
        passwordHash: "stored-hash",
        firstName: "James",
        lastName: "Arnold",
      };

      mockedPrisma.user.findUnique.mockResolvedValue(user as never);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockedJwt.sign.mockReturnValue("mock-jwt-token" as never);

      const req = {
        body: {
          email: " James@Example.com ",
          password: "Password123",
        },
      } as Request;

      const res = createResponse();

      await login(req as never, res);

      expect(mockedJwt.sign).toHaveBeenCalledWith(
        {
          sub: "user-123",
          email: "james@example.com",
        },
        "unit-test-secret",
        {
          expiresIn: "1h",
        }
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Login successful.",
        token: "mock-jwt-token",
        user: {
          id: "user-123",
          email: "james@example.com",
          firstName: "James",
          lastName: "Arnold",
        },
      });
    });
  });
});
