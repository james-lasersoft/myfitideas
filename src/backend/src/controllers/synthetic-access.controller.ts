import crypto from "node:crypto";
import type { Response } from "express";
import prisma from "../config/prisma.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

function enabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.ALLOW_SYNTHETIC_DATA_GENERATION === "true";
}

async function authorize(req: AuthenticatedRequest, res: Response): Promise<boolean> {
  if (!req.user) {
    res.status(401).json({ error: "Authentication is required." });
    return false;
  }
  if (!enabled()) {
    res.status(403).json({ error: "Development access provisioning is disabled for this environment." });
    return false;
  }
  const membership = await prisma.organizationMembership.findFirst({
    where: { userId: req.user.id, status: "ACTIVE", roles: { some: { role: { key: "super-administrator", isActive: true } } } },
    select: { id: true },
  });
  if (!membership) {
    res.status(403).json({ error: "Super administrator access is required." });
    return false;
  }
  return true;
}

export async function getSyntheticAccess(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!(await authorize(req, res))) return;
    const userId = typeof req.query.userId === "string" ? req.query.userId : "";
    if (!userId) {
      res.status(400).json({ error: "A target user is required." });
      return;
    }
    const [user, plans, activeSubscription] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, status: true } }),
      prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, key: true, name: true, description: true } }),
      prisma.userSubscription.findFirst({
        where: { userId, status: "ACTIVE", startedAt: { lte: new Date() }, OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] },
        orderBy: { startedAt: "desc" },
        select: { id: true, status: true, startedAt: true, endsAt: true, plan: { select: { id: true, key: true, name: true } } },
      }),
    ]);
    if (!user || user.status !== "ACTIVE") {
      res.status(404).json({ error: "The selected active user was not found." });
      return;
    }
    res.json({ plans, activeSubscription });
  } catch (error) {
    console.error("Get synthetic access error:", error);
    res.status(500).json({ error: "Unable to retrieve development access information." });
  }
}

export async function provisionSyntheticAccess(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!(await authorize(req, res)) || !req.user) return;
    const { userId, planKey } = req.body as { userId?: string; planKey?: string };
    if (!userId || !planKey) {
      res.status(400).json({ error: "A target user and plan are required." });
      return;
    }
    const [user, plan, existing] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, status: true } }),
      prisma.subscriptionPlan.findFirst({ where: { key: planKey, isActive: true }, select: { id: true, key: true, name: true } }),
      prisma.userSubscription.findFirst({
        where: { userId, status: "ACTIVE", startedAt: { lte: new Date() }, OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] },
        orderBy: { startedAt: "desc" },
        select: { id: true, status: true, startedAt: true, endsAt: true, plan: { select: { id: true, key: true, name: true } } },
      }),
    ]);
    if (!user || user.status !== "ACTIVE") {
      res.status(404).json({ error: "The selected active user was not found." });
      return;
    }
    if (!plan) {
      res.status(404).json({ error: "The selected active plan was not found." });
      return;
    }
    if (existing) {
      res.json({ subscription: existing, created: false });
      return;
    }
    const subscription = await prisma.$transaction(async (tx) => {
      const created = await tx.userSubscription.create({
        data: { id: crypto.randomUUID(), userId, planId: plan.id, status: "ACTIVE", startedAt: new Date() },
        select: { id: true, status: true, startedAt: true, endsAt: true, plan: { select: { id: true, key: true, name: true } } },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: req.user!.id,
          action: "synthetic_data.provision_access",
          targetType: "UserSubscription",
          targetId: created.id,
          result: "SUCCESS",
          metadata: { targetUserId: userId, planKey: plan.key, developmentOnly: true },
        },
      });
      return created;
    });
    res.status(201).json({ subscription, created: true });
  } catch (error) {
    console.error("Provision synthetic access error:", error);
    res.status(500).json({ error: "Unable to provision development access." });
  }
}
