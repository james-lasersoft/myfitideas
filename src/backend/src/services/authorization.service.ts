import prisma from "../config/prisma.js";
import { getUserEntitlements } from "./entitlement.service.js";

export interface AuthorizationSnapshot {
  organizationId: string | null;
  organizationName: string | null;
  membershipId: string | null;
  roles: string[];
  permissions: string[];
  entitlements: string[];
  companyUser: boolean;
  mfaRequired: boolean;
  mfaEnabled: boolean;
}

const COMPANY_ROLE_KEYS = new Set([
  "coach",
  "support-agent",
  "content-admin",
  "billing-admin",
  "system-admin",
  "organization-administrator",
  "super-administrator",
  "support",
  "translator",
]);

export async function getAuthorizationSnapshot(userId: string, organizationId?: string): Promise<AuthorizationSnapshot> {
  const [memberships, user, entitlements] = await Promise.all([
    prisma.organizationMembership.findMany({
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
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { mfaEnabled: true } }),
    getUserEntitlements(userId),
  ]);

  const membership = memberships[0];
  if (!membership) {
    return {
      organizationId: null,
      organizationName: null,
      membershipId: null,
      roles: [],
      permissions: [],
      entitlements,
      companyUser: false,
      mfaRequired: false,
      mfaEnabled: user?.mfaEnabled ?? false,
    };
  }

  const roles = membership.roles.filter(({ role }) => role.isActive).map(({ role }) => role.key);
  const permissions = [...new Set(
    membership.roles
      .filter(({ role }) => role.isActive)
      .flatMap(({ role }) => role.permissions.map(({ permission }) => permission.key))
  )].sort();
  const companyUser = roles.some((role) => COMPANY_ROLE_KEYS.has(role));

  return {
    organizationId: membership.organizationId,
    organizationName: membership.organization.displayName,
    membershipId: membership.id,
    roles,
    permissions,
    entitlements,
    companyUser,
    mfaRequired: companyUser,
    mfaEnabled: user?.mfaEnabled ?? false,
  };
}

export async function userHasPermission(userId: string, permission: string, organizationId?: string): Promise<boolean> {
  const snapshot = await getAuthorizationSnapshot(userId, organizationId);
  return snapshot.permissions.includes(permission);
}
