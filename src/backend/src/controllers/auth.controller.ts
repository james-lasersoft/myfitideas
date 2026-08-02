import crypto from "node:crypto";
import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import { getAuthorizationSnapshot } from "../services/authorization.service.js";
import { writeAuditLog } from "../services/audit.service.js";

interface RegisterRequestBody {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
}

interface LoginRequestBody {
  email?: string;
  password?: string;
}

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined.");
  return secret;
};

export const register = async (
  req: Request<Record<string, never>, unknown, RegisterRequestBody>,
  res: Response
): Promise<void> => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;
    const firstName = req.body.firstName?.trim();
    const lastName = req.body.lastName?.trim() || null;

    if (!email || !password || !firstName) {
      res.status(400).json({ error: "Email, password, and first name are required." });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Password must contain at least 8 characters." });
      return;
    }
    if (await prisma.user.findUnique({ where: { email } })) {
      res.status(409).json({ error: "An account with that email already exists." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash, firstName, lastName, status: "ACTIVE" },
      select: { id: true, email: true, firstName: true, lastName: true, createdAt: true },
    });

    res.status(201).json({ message: "User registered successfully.", user });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "An unexpected error occurred during registration." });
  }
};

export const login = async (
  req: Request<Record<string, never>, unknown, LoginRequestBody>,
  res: Response
): Promise<void> => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }
    if (user.status !== "ACTIVE") {
      await writeAuditLog({ actorUserId: user.id, action: "LOGIN_DENIED", targetType: "User", targetId: user.id, result: "DENIED", metadata: { status: user.status }, request: req });
      res.status(403).json({ error: "This account is not active." });
      return;
    }

    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const token = jwt.sign(
      { sub: user.id, email: user.email, tokenVersion: user.tokenVersion, sessionId },
      getJwtSecret(),
      { expiresIn: "1h" }
    );
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    await prisma.$transaction([
      prisma.userSession.create({
        data: {
          id: sessionId,
          userId: user.id,
          tokenHash,
          userAgent: req.get("user-agent") ?? null,
          ipAddress: req.ip,
          expiresAt,
        },
      }),
      prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    ]);

    const authorization = await getAuthorizationSnapshot(user.id);
    await writeAuditLog({ organizationId: authorization.organizationId, actorUserId: user.id, action: "LOGIN_SUCCEEDED", targetType: "UserSession", targetId: sessionId, request: req });

    res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        mustChangePassword: user.mustChangePassword,
      },
      authorization,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "An unexpected error occurred during login." });
  }
};
