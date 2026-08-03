import crypto from "node:crypto";
import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { getAuthorizationSnapshot } from "../services/authorization.service.js";
import { writeAuditLog } from "../services/audit.service.js";
import {
  buildOtpAuthUri,
  decryptMfaSecret,
  encryptMfaSecret,
  generateMfaSecret,
  generateRecoveryCodes,
  verifyTotp,
} from "../services/mfa.service.js";

interface RegisterRequestBody {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
}

interface LoginRequestBody {
  email?: string;
  password?: string;
  mfaCode?: string;
}

interface RefreshRequestBody {
  refreshToken?: string;
}

interface MfaEnrollmentBody {
  enrollmentToken?: string;
  code?: string;
}

const ACCESS_TOKEN_SECONDS = 15 * 60;
const REFRESH_TOKEN_DAYS = 30;
const ENROLLMENT_TOKEN_SECONDS = 10 * 60;

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined.");
  return secret;
};

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function signAccessToken(user: { id: string; email: string; tokenVersion: number }, sessionId: string): string {
  return jwt.sign(
    { sub: user.id, email: user.email, tokenVersion: user.tokenVersion, sessionId, tokenType: "access" },
    getJwtSecret(),
    { expiresIn: ACCESS_TOKEN_SECONDS }
  );
}

function createRefreshToken(): string {
  return crypto.randomBytes(48).toString("base64url");
}

function signEnrollmentToken(user: { id: string; email: string; tokenVersion: number }): string {
  return jwt.sign(
    { sub: user.id, email: user.email, tokenVersion: user.tokenVersion, tokenType: "mfa-enrollment" },
    getJwtSecret(),
    { expiresIn: ENROLLMENT_TOKEN_SECONDS }
  );
}

async function createSession(user: { id: string; email: string; tokenVersion: number }, req: Request) {
  const sessionId = crypto.randomUUID();
  const accessToken = signAccessToken(user, sessionId);
  const refreshToken = createRefreshToken();
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_SECONDS * 1000);
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

  await prisma.userSession.create({
    data: {
      id: sessionId,
      userId: user.id,
      tokenHash: hashToken(accessToken),
      refreshTokenHash: hashToken(refreshToken),
      userAgent: req.get("user-agent") ?? null,
      ipAddress: req.ip,
      expiresAt,
      refreshExpiresAt,
    },
  });

  return { accessToken, refreshToken, expiresAt, refreshExpiresAt, sessionId };
}

async function verifyRecoveryCode(userId: string, code: string, stored: unknown): Promise<boolean> {
  if (!Array.isArray(stored)) return false;
  const hash = hashToken(code.trim().toUpperCase());
  const hashes = stored.filter((value): value is string => typeof value === "string");
  if (!hashes.includes(hash)) return false;
  await prisma.user.update({
    where: { id: userId },
    data: { mfaRecoveryCodeHashes: hashes.filter((value) => value !== hash) },
  });
  return true;
}

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

    const [organization, freeRole, freePlan] = await Promise.all([
      prisma.organization.findUnique({ where: { slug: "myfitideas" } }),
      prisma.role.findFirst({ where: { key: "free-user", organization: { slug: "myfitideas" } } }),
      prisma.subscriptionPlan.findUnique({ where: { key: "free" } }),
    ]);
    if (!organization || !freeRole || !freePlan) {
      res.status(503).json({ error: "Account registration is temporarily unavailable." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({ data: { email, passwordHash, firstName, lastName, status: "ACTIVE" } });
      const membership = await tx.organizationMembership.create({ data: { userId: created.id, organizationId: organization.id, status: "ACTIVE" } });
      await tx.membershipRole.create({ data: { membershipId: membership.id, roleId: freeRole.id } });
      await tx.userSubscription.create({ data: { userId: created.id, planId: freePlan.id, status: "ACTIVE" } });
      return created;
    });

    await writeAuditLog({ organizationId: organization.id, actorUserId: user.id, action: "USER_REGISTERED", targetType: "User", targetId: user.id, request: req });
    await writeAuditLog({ organizationId: organization.id, actorUserId: user.id, action: "SUBSCRIPTION_ASSIGNED", targetType: "SubscriptionPlan", targetId: freePlan.id, afterState: { plan: "free" }, request: req });
    res.status(201).json({ message: "User registered successfully.", user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, createdAt: user.createdAt } });
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

    const authorization = await getAuthorizationSnapshot(user.id);
    if (authorization.mfaRequired && !user.mfaEnabled) {
      const enrollmentToken = signEnrollmentToken(user);
      await writeAuditLog({ organizationId: authorization.organizationId, actorUserId: user.id, action: "MFA_ENROLLMENT_REQUIRED", targetType: "User", targetId: user.id, result: "DENIED", request: req });
      res.status(403).json({ code: "MFA_ENROLLMENT_REQUIRED", error: "Multi-factor authentication enrollment is required for company users.", enrollmentToken });
      return;
    }

    if (authorization.mfaRequired) {
      const code = req.body.mfaCode?.trim();
      if (!code || !user.mfaSecretEncrypted) {
        res.status(401).json({ code: "MFA_REQUIRED", error: "A multi-factor authentication code is required." });
        return;
      }
      const validTotp = verifyTotp(decryptMfaSecret(user.mfaSecretEncrypted), code);
      const validRecovery = validTotp ? false : await verifyRecoveryCode(user.id, code, user.mfaRecoveryCodeHashes);
      if (!validTotp && !validRecovery) {
        await writeAuditLog({ organizationId: authorization.organizationId, actorUserId: user.id, action: "MFA_CHALLENGE_FAILED", targetType: "User", targetId: user.id, result: "DENIED", request: req });
        res.status(401).json({ code: "MFA_INVALID", error: "The multi-factor authentication code is invalid." });
        return;
      }
    }

    const session = await createSession(user, req);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await writeAuditLog({ organizationId: authorization.organizationId, actorUserId: user.id, action: "LOGIN_SUCCEEDED", targetType: "UserSession", targetId: session.sessionId, request: req });

    res.status(200).json({
      message: "Login successful.",
      token: session.accessToken,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      accessTokenExpiresAt: session.expiresAt,
      refreshTokenExpiresAt: session.refreshExpiresAt,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, mustChangePassword: user.mustChangePassword },
      authorization,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "An unexpected error occurred during login." });
  }
};

export const refreshAccessToken = async (
  req: Request<Record<string, never>, unknown, RefreshRequestBody>,
  res: Response
): Promise<void> => {
  try {
    const refreshToken = req.body.refreshToken?.trim();
    if (!refreshToken) {
      res.status(400).json({ error: "A refresh token is required." });
      return;
    }

    const session = await prisma.userSession.findUnique({
      where: { refreshTokenHash: hashToken(refreshToken) },
      include: { user: true },
    });
    if (!session || session.revokedAt || !session.refreshExpiresAt || session.refreshExpiresAt <= new Date() || session.user.status !== "ACTIVE") {
      res.status(401).json({ error: "The refresh token is invalid or expired." });
      return;
    }

    const nextAccessToken = signAccessToken(session.user, session.id);
    const nextRefreshToken = createRefreshToken();
    const expiresAt = new Date(Date.now() + ACCESS_TOKEN_SECONDS * 1000);
    const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        tokenHash: hashToken(nextAccessToken),
        refreshTokenHash: hashToken(nextRefreshToken),
        expiresAt,
        refreshExpiresAt,
        lastSeenAt: new Date(),
      },
    });
    await writeAuditLog({ actorUserId: session.userId, action: "REFRESH_TOKEN_ROTATED", targetType: "UserSession", targetId: session.id, request: req });
    res.status(200).json({ accessToken: nextAccessToken, refreshToken: nextRefreshToken, accessTokenExpiresAt: expiresAt, refreshTokenExpiresAt: refreshExpiresAt });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(500).json({ error: "Unable to refresh the session." });
  }
};

export const logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user?.sessionId) {
    res.status(204).send();
    return;
  }
  await prisma.userSession.updateMany({ where: { id: req.user.sessionId, userId: req.user.id }, data: { revokedAt: new Date(), refreshTokenHash: null } });
  await writeAuditLog({ actorUserId: req.user.id, action: "SESSION_REVOKED", targetType: "UserSession", targetId: req.user.sessionId, request: req });
  res.status(204).send();
};

function verifyEnrollmentToken(value: string): { sub: string; email: string } {
  const decoded = jwt.verify(value, getJwtSecret()) as { sub?: string; email?: string; tokenType?: string };
  if (decoded.tokenType !== "mfa-enrollment" || !decoded.sub || !decoded.email) throw new Error("Invalid MFA enrollment token.");
  return { sub: decoded.sub, email: decoded.email };
}

export const beginMfaEnrollment = async (
  req: Request<Record<string, never>, unknown, MfaEnrollmentBody>,
  res: Response
): Promise<void> => {
  try {
    const enrollmentToken = req.body.enrollmentToken?.trim();
    if (!enrollmentToken) {
      res.status(400).json({ error: "An MFA enrollment token is required." });
      return;
    }
    const identity = verifyEnrollmentToken(enrollmentToken);
    const secret = generateMfaSecret();
    await prisma.user.update({ where: { id: identity.sub }, data: { mfaSecretEncrypted: encryptMfaSecret(secret), mfaEnabled: false } });
    await writeAuditLog({ actorUserId: identity.sub, action: "MFA_ENROLLMENT_STARTED", targetType: "User", targetId: identity.sub, request: req });
    res.status(200).json({ secret, otpAuthUri: buildOtpAuthUri(identity.email, secret) });
  } catch {
    res.status(401).json({ error: "The MFA enrollment token is invalid or expired." });
  }
};

export const completeMfaEnrollment = async (
  req: Request<Record<string, never>, unknown, MfaEnrollmentBody>,
  res: Response
): Promise<void> => {
  try {
    const enrollmentToken = req.body.enrollmentToken?.trim();
    const code = req.body.code?.trim();
    if (!enrollmentToken || !code) {
      res.status(400).json({ error: "An enrollment token and verification code are required." });
      return;
    }
    const identity = verifyEnrollmentToken(enrollmentToken);
    const user = await prisma.user.findUnique({ where: { id: identity.sub } });
    if (!user?.mfaSecretEncrypted || !verifyTotp(decryptMfaSecret(user.mfaSecretEncrypted), code)) {
      res.status(400).json({ error: "The verification code is invalid." });
      return;
    }
    const recoveryCodes = generateRecoveryCodes();
    await prisma.user.update({
      where: { id: user.id },
      data: { mfaEnabled: true, mfaRecoveryCodeHashes: recoveryCodes.hashes },
    });
    await writeAuditLog({ actorUserId: user.id, action: "MFA_ENABLED", targetType: "User", targetId: user.id, request: req });
    res.status(200).json({ message: "Multi-factor authentication enabled.", recoveryCodes: recoveryCodes.plain });
  } catch {
    res.status(401).json({ error: "The MFA enrollment token is invalid or expired." });
  }
};
