import prisma from "../config/prisma.js";

export interface AuthorizationSnapshot {
  organizationId: string | null;
  organizationName: string | null;
  membershipId: string | null;
  roles: string[];
  permissions: string[];
}

export async function getAuthorizationSnapshot(userId: string, organizationId?: string): Promise<AuthorizationSnapshot> {
  const memberships = await prisma.organizationMembership.findMany({
    where: {
      userId,
      status: "ACTIVE",
      organization: { isActive: true },
      ...(organizationId ? { organizationId } : {}),
    },
    include: {
      organization: true,
      roles: {
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } },
            },
          },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  const membership = memberships[0];
  if (!membership) {
    return { organizationId: null, organizationName: null, membershipId: null, roles: [], permissions: [] };
  }

  const roles = membership.roles.filter(({ role }) => role.isActive).map(({ role }) => role.key);
  const permissions = [...new Set(
    membership.roles
      .filter(({ role }) => role.isActive)
      .flatMap(({ role }) => role.permissions.map(({ permission }) => permission.key))
  )].sort();

  return {
    organizationId: membership.organizationId,
    organizationName: membership.organization.displayName,
    membershipId: membership.id,
    roles,
    permissions,
  };
}

export async function userHasPermission(userId: string, permission: string, organizationId?: string): Promise<boolean> {
  const snapshot = await getAuthorizationSnapshot(userId, organizationId);
  return snapshot.permissions.includes(permission);
}
