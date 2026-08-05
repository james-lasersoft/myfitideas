import type { Response } from "express";
import { Prisma } from "../generated/prisma/client.js";
import prisma from "../config/prisma.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { writeAuditLog } from "../services/audit.service.js";

const TRUSTED_DEVICE_PREFIX = "trusted:";

function param(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export const listSecurityUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const users = await prisma.user.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { email: "asc" }],
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
      mfaEnabled: true,
      lastLoginAt: true,
      sessions: {
        where: { revokedAt: null },
        select: { id: true, tokenHash: true, expiresAt: true, refreshExpiresAt: true },
      },
      memberships: {
        where: { status: "ACTIVE" },
        select: { roles: { select: { role: { select: { key: true, name: true } } } } },
      },
    },
  });

  res.status(200).json({
    users: users.map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      mfaEnabled: user.mfaEnabled,
      lastLoginAt: user.lastLoginAt,
      activeSessions: user.sessions.filter((session) => !session.tokenHash.startsWith(TRUSTED_DEVICE_PREFIX)).length,
      trustedDevices: user.sessions.filter((session) => session.tokenHash.startsWith(TRUSTED_DEVICE_PREFIX) && session.expiresAt > new Date()).length,
      roles: user.memberships.flatMap((membership) => membership.roles.map(({ role }) => ({ key: role.key, name: role.name }))),
    })),
  });
};

export const resetUserMfa = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Authentication is required." }); return; }
  const userId = param(req.params.userId);
  if (!userId) { res.status(400).json({ error: "A user ID is required." }); return; }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecretEncrypted: null,
        mfaRecoveryCodeHashes: Prisma.JsonNull,
        tokenVersion: { increment: 1 },
      },
    }),
    prisma.userSession.updateMany({
      where: { userId },
      data: { revokedAt: new Date(), refreshTokenHash: null },
    }),
  ]);

  await writeAuditLog({
    actorUserId: req.user.id,
    action: "ADMIN_MFA_RESET",
    targetType: "User",
    targetId: userId,
    request: req,
  });
  res.status(204).send();
};

export const revokeAllUserSessions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Authentication is required." }); return; }
  const userId = param(req.params.userId);
  if (!userId) { res.status(400).json({ error: "A user ID is required." }); return; }

  await prisma.$transaction([
    prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), refreshTokenHash: null },
    }),
    prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } }),
  ]);

  await writeAuditLog({
    actorUserId: req.user.id,
    action: "ADMIN_SESSIONS_REVOKED",
    targetType: "User",
    targetId: userId,
    request: req,
  });
  res.status(204).send();
};
