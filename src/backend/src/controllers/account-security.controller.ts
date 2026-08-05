import type { Response } from "express";
import prisma from "../config/prisma.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { writeAuditLog } from "../services/audit.service.js";

const TRUSTED_DEVICE_PREFIX = "trusted:";

export const listActiveSessions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Authentication is required." });
    return;
  }

  const sessions = await prisma.userSession.findMany({
    where: {
      userId: req.user.id,
      revokedAt: null,
      refreshExpiresAt: { gt: new Date() },
      NOT: { tokenHash: { startsWith: TRUSTED_DEVICE_PREFIX } },
    },
    orderBy: { lastSeenAt: "desc" },
    select: {
      id: true,
      userAgent: true,
      ipAddress: true,
      createdAt: true,
      lastSeenAt: true,
      refreshExpiresAt: true,
    },
  });

  res.status(200).json({
    sessions: sessions.map((session) => ({
      ...session,
      current: session.id === req.user?.sessionId,
    })),
  });
};

export const revokeSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Authentication is required." });
    return;
  }

  const sessionId = typeof req.params.id === "string" ? req.params.id : undefined;
  if (!sessionId) {
    res.status(400).json({ error: "A session ID is required." });
    return;
  }

  await prisma.userSession.updateMany({
    where: {
      id: sessionId,
      userId: req.user.id,
      NOT: { tokenHash: { startsWith: TRUSTED_DEVICE_PREFIX } },
    },
    data: { revokedAt: new Date(), refreshTokenHash: null },
  });

  await writeAuditLog({
    actorUserId: req.user.id,
    action: "SESSION_REVOKED_BY_USER",
    targetType: "UserSession",
    targetId: sessionId,
    request: req,
  });

  res.status(204).send();
};

export const revokeOtherSessions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Authentication is required." });
    return;
  }

  await prisma.userSession.updateMany({
    where: {
      userId: req.user.id,
      revokedAt: null,
      ...(req.user.sessionId ? { id: { not: req.user.sessionId } } : {}),
    },
    data: { revokedAt: new Date(), refreshTokenHash: null },
  });

  await writeAuditLog({
    actorUserId: req.user.id,
    action: "OTHER_SESSIONS_REVOKED",
    targetType: "User",
    targetId: req.user.id,
    request: req,
  });

  res.status(204).send();
};
