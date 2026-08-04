import type { Response } from "express";
import prisma from "../config/prisma.js";
import type { AuthorizedRequest } from "../middleware/permission.middleware.js";
import { writeAuditLog } from "../services/audit.service.js";

function requireActor(req: AuthorizedRequest): string {
  if (!req.user) throw new Error("Authenticated user is required.");
  return req.user.id;
}

function organizationId(req: AuthorizedRequest): string {
  const value = req.authorization?.organizationId;
  if (!value) throw new Error("An active organization membership is required.");
  return value;
}

function requireRoleId(req: AuthorizedRequest): string {
  const value = req.params.roleId;
  if (typeof value !== "string" || !value.trim()) throw new Error("A valid roleId route parameter is required.");
  return value;
}

export async function deleteRole(req: AuthorizedRequest, res: Response): Promise<void> {
  const actorUserId = requireActor(req);
  const orgId = organizationId(req);
  const roleId = requireRoleId(req);

  const role = await prisma.role.findFirst({
    where: { id: roleId, organizationId: orgId },
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { memberships: true } },
    },
  });

  if (!role) {
    res.status(404).json({ error: "Role was not found." });
    return;
  }

  if (role.isProtected || role.isSystem) {
    res.status(400).json({ error: "Protected and system roles cannot be deleted." });
    return;
  }

  const actorPermissions = new Set(req.authorization?.permissions ?? []);
  const unauthorizedPermissions = role.permissions
    .map(({ permission }) => permission.key)
    .filter((key) => !actorPermissions.has(key))
    .sort();

  if (unauthorizedPermissions.length > 0) {
    res.status(403).json({
      error: "You cannot delete a role containing permissions you do not hold.",
      unauthorizedPermissions,
    });
    return;
  }

  if (role._count.memberships > 0) {
    res.status(409).json({
      error: "Remove or reassign all users before deleting this role.",
      assignedUsers: role._count.memberships,
    });
    return;
  }

  const pendingInvitations = await prisma.invitation.count({
    where: { roleId: role.id, organizationId: orgId, status: "PENDING" },
  });

  if (pendingInvitations > 0) {
    res.status(409).json({
      error: "Revoke or complete pending invitations before deleting this role.",
      pendingInvitations,
    });
    return;
  }

  const beforeState = {
    id: role.id,
    key: role.key,
    name: role.name,
    description: role.description,
    permissions: role.permissions.map(({ permission }) => permission.key),
  };

  await prisma.role.delete({ where: { id: role.id } });
  await writeAuditLog({
    organizationId: orgId,
    actorUserId,
    action: "ROLE_DELETED",
    targetType: "Role",
    targetId: role.id,
    beforeState,
    request: req,
  });

  res.status(204).send();
}
