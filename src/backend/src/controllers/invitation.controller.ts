import crypto from "node:crypto";
import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../config/prisma.js";
import { writeAuditLog } from "../services/audit.service.js";

export async function inspectInvitation(req: Request, res: Response): Promise<void> {
  const token = String(req.query.token ?? "");
  if (!token) {
    res.status(400).json({ error: "Invitation token is required." });
    return;
  }
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const invitation = await prisma.invitation.findUnique({ where: { tokenHash }, include: { organization: true, role: true } });
  if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt <= new Date()) {
    res.status(404).json({ error: "Invitation is invalid or expired." });
    return;
  }
  res.json({ email: invitation.email, organization: invitation.organization.displayName, role: invitation.role?.name ?? null, expiresAt: invitation.expiresAt });
}

export async function acceptInvitation(req: Request, res: Response): Promise<void> {
  const token = String(req.body?.token ?? "");
  const firstName = String(req.body?.firstName ?? "").trim();
  const lastName = String(req.body?.lastName ?? "").trim() || null;
  const password = String(req.body?.password ?? "");
  if (!token || !firstName || password.length < 8) {
    res.status(400).json({ error: "Invitation token, first name, and a password of at least 8 characters are required." });
    return;
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const invitation = await prisma.invitation.findUnique({ where: { tokenHash } });
  if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt <= new Date()) {
    res.status(404).json({ error: "Invitation is invalid or expired." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: invitation.email },
      update: { firstName, lastName, passwordHash, status: "ACTIVE", mustChangePassword: false },
      create: { email: invitation.email, firstName, lastName, passwordHash, status: "ACTIVE" },
    });
    const membership = await tx.organizationMembership.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId: invitation.organizationId } },
      update: { status: "ACTIVE" },
      create: { userId: user.id, organizationId: invitation.organizationId, status: "ACTIVE" },
    });
    if (invitation.roleId) {
      await tx.membershipRole.upsert({
        where: { membershipId_roleId: { membershipId: membership.id, roleId: invitation.roleId } },
        update: {},
        create: { membershipId: membership.id, roleId: invitation.roleId },
      });
    }
    await tx.invitation.update({ where: { id: invitation.id }, data: { status: "ACCEPTED", acceptedByUserId: user.id, acceptedAt: new Date() } });
    return { user, membership };
  });

  await writeAuditLog({ organizationId: invitation.organizationId, actorUserId: result.user.id, action: "INVITATION_ACCEPTED", targetType: "Invitation", targetId: invitation.id, request: req });
  res.status(201).json({ message: "Invitation accepted. You can now sign in." });
}
