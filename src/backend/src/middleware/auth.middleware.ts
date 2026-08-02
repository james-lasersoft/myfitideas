import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

interface JwtPayload {
  sub: string;
  email: string;
  tokenVersion?: number;
  sessionId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    sessionId?: string;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication token is required." });
    return;
  }

  const token = authorizationHeader.substring(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("JWT_SECRET is not defined.");
    res.status(500).json({ error: "Authentication configuration error." });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, email: true, status: true, tokenVersion: true },
    });

    if (!user || user.status !== "ACTIVE" || user.tokenVersion !== (decoded.tokenVersion ?? 0)) {
      res.status(401).json({ error: "This session is no longer active." });
      return;
    }

    if (decoded.sessionId) {
      const session = await prisma.userSession.findUnique({ where: { id: decoded.sessionId } });
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      if (!session || session.revokedAt || session.expiresAt <= new Date() || session.tokenHash !== tokenHash) {
        res.status(401).json({ error: "This session is no longer active." });
        return;
      }
      await prisma.userSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
    }

    req.user = { id: user.id, email: user.email, sessionId: decoded.sessionId };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired authentication token." });
  }
};
