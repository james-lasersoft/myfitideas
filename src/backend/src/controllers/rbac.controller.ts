import crypto from "node:crypto";
import type { Response } from "express";
import prisma from "../config/prisma.js";
import type { AuthorizedRequest } from "../middleware/permission.middleware.js";
import { getAuthorizationSnapshot } from "../services/authorization.service.js";
import { writeAuditLog } from "../services/audit.service.js";

const allowedUserStatuses = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;
type AllowedUserStatus = (typeof allowedUserStatuses)[number];

function requireActor(req: AuthorizedRequest): string {
  if (!req.user) throw new Error("Authenticated user is required.");
  return req.user.id;
}

function organizationId(req: AuthorizedRequest): string {
  const value = req.authorization?.organizationId;
  if (!value) throw new Error("An active organization membership is required.");
  return value;
}

function actorPermissions(req: AuthorizedRequest): Set<string> {
  return new Set(req.authorization?.permissions ?? []);
}

function unauthorizedPermissionKeys(req: AuthorizedRequest, permissionKeys: string[]): string[] {
  const allowed = actorPermissions(req);
  return [...new Set(permissionKeys)].filter((key) => !allowed.has(key)).sort();
}

function requireRouteParam(req: AuthorizedRequest, name: string): string {
  const value = req.params[name];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`A valid ${name} route parameter is required.`);
  }
  return value;
}

function isAllowedUserStatus(value: unknown): value is AllowedUserStatus {
  return typeof value === "string" && allowedUserStatuses.includes(value as AllowedUserStatus);
}

export async function getMyAuthorization(req: AuthorizedRequest, res: Response): Promise<void> {
  const userId = requireActor(req);
  const requestedOrg = typeof req.headers["x-organization-id"] === "string" ? req.headers["x-organization-id"] : undefined;
  const authorization = await getAuthorizationSnapshot(userId, requestedOrg);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, lastName: true, status: true, mustChangePassword: true },
  });
  res.json({ user, authorization });
}

export async function listUsers(req: AuthorizedRequest, res: Response): Promise<void> {
  const orgId = organizationId(req);
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 25));
  const where = {
    organizationId: orgId,
    ...(search ? { user: { OR: [
      { email: { contains: search, mode: "insensitive" as const } },
      { firstName: { contains: search, mode: "insensitive" as const } },
      { lastName: { contains: search, mode: "insensitive" as const } },
    ] } } : {}),
  };

  const [total, memberships] = await Promise.all([
    prisma.organizationMembership.count({ where }),
    prisma.organizationMembership.findMany({
      where,
      include: { user: true, roles: { include: { role: true } } },
      orderBy: { user: { email: "asc" } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  res.json({
    items: memberships.map((membership) => ({
      membershipId: membership.id,
      membershipStatus: membership.status,
      joinedAt: membership.joinedAt,
      user: {
        id: membership.user.id,
        email: membership.user.email,
        firstName: membership.user.firstName,
        lastName: membership.user.lastName,
        status: membership.user.status,
        lastLoginAt: membership.user.lastLoginAt,
        mustChangePassword: membership.user.mustChangePassword,
      },
      roles: membership.roles.map(({ role }) => ({ id: role.id, key: role.key, name: role.name })),
    })),
    pagination: { page, pageSize, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) },
  });
}

export async function updateUserStatus(req: AuthorizedRequest, res: Response): Promise<void> {
  const actorUserId = requireActor(req);
  const orgId = organizationId(req);
  const targetUserId = requireRouteParam(req, "userId");
  const status = req.body?.status;
  if (!isAllowedUserStatus(status)) {
    res.status(400).json({ error: "A valid user status is required." });
    return;
  }
  if (actorUserId === targetUserId && status !== "ACTIVE") {
    res.status(400).json({ error: "You cannot deactivate or suspend your own account." });
    return;
  }

  const membership = await prisma.organizationMembership.findUnique({
    where: { userId_organizationId: { userId: targetUserId, organizationId: orgId } },
    include: { user: true },
  });
  if (!membership) {
    res.status(404).json({ error: "User membership was not found." });
    return;
  }

  const updated = await prisma.user.update({ where: { id: targetUserId }, data: { status } });
  if (status !== "ACTIVE") {
    await prisma.userSession.updateMany({ where: { userId: targetUserId, revokedAt: null }, data: { revokedAt: new Date() } });
    await prisma.user.update({ where: { id: targetUserId }, data: { tokenVersion: { increment: 1 } } });
  }
  await writeAuditLog({ organizationId: orgId, actorUserId, action: "USER_STATUS_CHANGED", targetType: "User", targetId: targetUserId, beforeState: { status: membership.user.status }, afterState: { status }, request: req });
  res.json({ id: updated.id, status: updated.status });
}

export async function listRoles(req: AuthorizedRequest, res: Response): Promise<void> {
  const orgId = organizationId(req);
  const roles = await prisma.role.findMany({
    where: { OR: [{ organizationId: orgId }, { organizationId: null, isSystem: true }] },
    include: { permissions: { include: { permission: true } }, _count: { select: { memberships: true } } },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });
  res.json(roles.map((role) => ({
    id: role.id,
    key: role.key,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    isProtected: role.isProtected,
    isActive: role.isActive,
    assignedUsers: role._count.memberships,
    permissions: role.permissions.map(({ permission }) => permission.key),
  })));
}

export async function listPermissions(_req: AuthorizedRequest, res: Response): Promise<void> {
  const permissions = await prisma.permission.findMany({ orderBy: [{ category: "asc" }, { key: "asc" }] });
  res.json(permissions);
}

export async function createRole(req: AuthorizedRequest, res: Response): Promise<void> {
  const actorUserId = requireActor(req);
  const orgId = organizationId(req);
  const name = String(req.body?.name ?? "").trim();
  const description = String(req.body?.description ?? "").trim() || null;
  const permissionKeys = Array.isArray(req.body?.permissions) ? req.body.permissions.filter((value: unknown): value is string => typeof value === "string") : [];
  if (!name) {
    res.status(400).json({ error: "Role name is required." });
    return;
  }
  const unauthorized = unauthorizedPermissionKeys(req, permissionKeys);
  if (unauthorized.length > 0) {
    res.status(403).json({
      error: "You cannot create a role with permissions you do not hold.",
      unauthorizedPermissions: unauthorized,
    });
    return;
  }
  const key = name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
  const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });
  const role = await prisma.role.create({
    data: {
      organizationId: orgId,
      key,
      name,
      description,
      permissions: { create: permissions.map((permission) => ({ permissionId: permission.id })) },
    },
    include: { permissions: { include: { permission: true } } },
  });
  await writeAuditLog({ organizationId: orgId, actorUserId, action: "ROLE_CREATED", targetType: "Role", targetId: role.id, afterState: role, request: req });
  res.status(201).json(role);
}

export async function updateRole(req: AuthorizedRequest, res: Response): Promise<void> {
  const actorUserId = requireActor(req);
  const orgId = organizationId(req);
  const roleId = requireRouteParam(req, "roleId");
  const role = await prisma.role.findUnique({ where: { id: roleId }, include: { permissions: true } });
  if (!role || role.organizationId !== orgId) {
    res.status(404).json({ error: "Role was not found." });
    return;
  }
  if (role.isProtected) {
    res.status(400).json({ error: "Protected roles cannot be modified." });
    return;
  }
  const permissionKeys = Array.isArray(req.body?.permissions) ? req.body.permissions.filter((value: unknown): value is string => typeof value === "string") : [];
  const unauthorized = unauthorizedPermissionKeys(req, permissionKeys);
  if (unauthorized.length > 0) {
    res.status(403).json({
      error: "You cannot update a role with permissions you do not hold.",
      unauthorizedPermissions: unauthorized,
    });
    return;
  }
  const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });
  const updated = await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
    return tx.role.update({
      where: { id: role.id },
      data: {
        name: typeof req.body?.name === "string" ? req.body.name.trim() : role.name,
        description: typeof req.body?.description === "string" ? req.body.description.trim() || null : role.description,
        isActive: typeof req.body?.isActive === "boolean" ? req.body.isActive : role.isActive,
        permissions: { create: permissions.map((permission) => ({ permissionId: permission.id })) },
      },
      include: { permissions: { include: { permission: true } } },
    });
  });
  await writeAuditLog({ organizationId: orgId, actorUserId, action: "ROLE_UPDATED", targetType: "Role", targetId: role.id, beforeState: role, afterState: updated, request: req });
  res.json(updated);
}

export async function assignRoles(req: AuthorizedRequest, res: Response): Promise<void> {
  const actorUserId = requireActor(req);
  const orgId = organizationId(req);
  const targetUserId = requireRouteParam(req, "userId");
  const roleIds = Array.isArray(req.body?.roleIds) ? req.body.roleIds.filter((value: unknown): value is string => typeof value === "string") : [];
  const membership = await prisma.organizationMembership.findUnique({
    where: { userId_organizationId: { userId: targetUserId, organizationId: orgId } },
    include: { roles: { include: { role: true } } },
  });
  if (!membership) {
    res.status(404).json({ error: "User membership was not found." });
    return;
  }
  const roles = await prisma.role.findMany({
    where: {
      id: { in: roleIds },
      OR: [{ organizationId: orgId }, { organizationId: null, isSystem: true }],
      isActive: true,
    },
    include: { permissions: { include: { permission: true } } },
  });
  const requestedPermissionKeys = roles.flatMap((role) => role.permissions.map(({ permission }) => permission.key));
  const unauthorized = unauthorizedPermissionKeys(req, requestedPermissionKeys);
  if (unauthorized.length > 0) {
    res.status(403).json({
      error: "You cannot assign a role that grants permissions you do not hold.",
      unauthorizedPermissions: unauthorized,
    });
    return;
  }
  await prisma.$transaction(async (tx) => {
    await tx.membershipRole.deleteMany({ where: { membershipId: membership.id } });
    if (roles.length) await tx.membershipRole.createMany({ data: roles.map((role) => ({ membershipId: membership.id, roleId: role.id })) });
  });
  await writeAuditLog({
    organizationId: orgId,
    actorUserId,
    action: "ROLES_ASSIGNED",
    targetType: "OrganizationMembership",
    targetId: membership.id,
    beforeState: membership.roles.map(({ role }) => role.key),
    afterState: roles.map((role) => role.key),
    request: req,
  });
  res.json({ membershipId: membership.id, roles: roles.map((role) => ({ id: role.id, key: role.key, name: role.name })) });
}

export async function createInvitation(req: AuthorizedRequest, res: Response): Promise<void> {
  const actorUserId = requireActor(req);
  const orgId = organizationId(req);
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const roleId = typeof req.body?.roleId === "string" ? req.body.roleId : null;
  if (!email || !email.includes("@")) {
    res.status(400).json({ error: "A valid email address is required." });
    return;
  }
  if (roleId) {
    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        OR: [{ organizationId: orgId }, { organizationId: null, isSystem: true }],
        isActive: true,
      },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) {
      res.status(400).json({ error: "The selected role is not available in this organization." });
      return;
    }
    const unauthorized = unauthorizedPermissionKeys(req, role.permissions.map(({ permission }) => permission.key));
    if (unauthorized.length > 0) {
      res.status(403).json({
        error: "You cannot invite a user into a role that grants permissions you do not hold.",
        unauthorizedPermissions: unauthorized,
      });
      return;
    }
  }
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const invitation = await prisma.invitation.create({
    data: {
      organizationId: orgId,
      email,
      roleId,
      tokenHash,
      createdByUserId: actorUserId,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
    },
  });
  await writeAuditLog({ organizationId: orgId, actorUserId, action: "INVITATION_CREATED", targetType: "Invitation", targetId: invitation.id, afterState: { email, roleId, expiresAt: invitation.expiresAt }, request: req });
  res.status(201).json({ invitation: { id: invitation.id, email, status: invitation.status, expiresAt: invitation.expiresAt }, token: rawToken, invitationPath: `/accept-invitation?token=${encodeURIComponent(rawToken)}` });
}

export async function listInvitations(req: AuthorizedRequest, res: Response): Promise<void> {
  const orgId = organizationId(req);
  const invitations = await prisma.invitation.findMany({ where: { organizationId: orgId }, include: { role: true, createdBy: { select: { firstName: true, lastName: true, email: true } } }, orderBy: { createdAt: "desc" } });
  res.json(invitations.map(({ tokenHash: _tokenHash, ...invitation }) => invitation));
}

export async function revokeSessions(req: AuthorizedRequest, res: Response): Promise<void> {
  const actorUserId = requireActor(req);
  const orgId = organizationId(req);
  const targetUserId = requireRouteParam(req, "userId");
  const membership = await prisma.organizationMembership.findUnique({ where: { userId_organizationId: { userId: targetUserId, organizationId: orgId } } });
  if (!membership) {
    res.status(404).json({ error: "User membership was not found." });
    return;
  }
  await prisma.$transaction([
    prisma.userSession.updateMany({ where: { userId: targetUserId, revokedAt: null }, data: { revokedAt: new Date() } }),
    prisma.user.update({ where: { id: targetUserId }, data: { tokenVersion: { increment: 1 } } }),
  ]);
  await writeAuditLog({ organizationId: orgId, actorUserId, action: "SESSIONS_REVOKED", targetType: "User", targetId: targetUserId, request: req });
  res.json({ message: "Active sessions revoked." });
}

export async function listAuditLogs(req: AuthorizedRequest, res: Response): Promise<void> {
  const orgId = organizationId(req);
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 25));
  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where: { organizationId: orgId } }),
    prisma.auditLog.findMany({ where: { organizationId: orgId }, include: { actor: { select: { email: true, firstName: true, lastName: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
  ]);
  res.json({ items, pagination: { page, pageSize, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) } });
}
