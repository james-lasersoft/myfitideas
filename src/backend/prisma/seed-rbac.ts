import "dotenv/config";
import prisma from "../src/config/prisma.js";

const DEFAULT_ORGANIZATION = {
  slug: "myfitideas",
  name: "myfitideas",
  displayName: "MyFitIdeas",
};

const permissions = [
  ["dashboard.read", "dashboard", "View dashboard"],
  ["measurements.read", "measurements", "View measurements"],
  ["measurements.create", "measurements", "Create measurements"],
  ["measurements.update", "measurements", "Update measurements"],
  ["measurements.delete", "measurements", "Delete measurements"],
  ["hydration.read", "hydration", "View hydration records"],
  ["hydration.create", "hydration", "Create hydration records"],
  ["hydration.update", "hydration", "Update hydration records"],
  ["hydration.delete", "hydration", "Delete hydration records"],
  ["profile.read", "profile", "View own profile"],
  ["profile.update", "profile", "Update own profile"],
  ["progress.read", "progress", "View progress analytics"],
  ["admin.access", "administration", "Access administration"],
  ["translations.read", "translations", "View translation catalog"],
  ["translations.edit", "translations", "Edit translations"],
  ["translations.publish", "translations", "Publish translations"],
  ["translations.manage_languages", "translations", "Manage languages"],
  ["users.read", "users", "View users"],
  ["users.create", "users", "Create users and invitations"],
  ["users.update", "users", "Update users"],
  ["users.deactivate", "users", "Deactivate users"],
  ["users.assign_roles", "users", "Assign roles to users"],
  ["users.revoke_sessions", "users", "Revoke user sessions"],
  ["roles.read", "roles", "View roles and permissions"],
  ["roles.create", "roles", "Create custom roles"],
  ["roles.update", "roles", "Update custom roles"],
  ["roles.delete", "roles", "Deactivate custom roles"],
  ["roles.assign_permissions", "roles", "Assign permissions to roles"],
  ["audit.read", "audit", "View administrative audit events"],
  ["organization.read", "organization", "View organization settings"],
  ["organization.update", "organization", "Update organization settings"],
] as const;

const memberPermissions = [
  "dashboard.read",
  "measurements.read",
  "measurements.create",
  "measurements.update",
  "measurements.delete",
  "hydration.read",
  "hydration.create",
  "hydration.update",
  "hydration.delete",
  "profile.read",
  "profile.update",
  "progress.read",
];

const roleDefinitions = [
  {
    key: "super-administrator",
    name: "Super Administrator",
    description: "Full platform and organization access.",
    isSystem: true,
    isProtected: true,
    permissionKeys: permissions.map(([key]) => key),
  },
  {
    key: "organization-administrator",
    name: "Organization Administrator",
    description: "Manages organization users, roles, translations, and settings.",
    isSystem: false,
    isProtected: true,
    permissionKeys: permissions.map(([key]) => key).filter((key) => key !== "roles.delete"),
  },
  {
    key: "translator",
    name: "Translator",
    description: "Reviews, edits, and publishes multilingual interface content.",
    isSystem: false,
    isProtected: true,
    permissionKeys: [
      ...memberPermissions,
      "admin.access",
      "translations.read",
      "translations.edit",
      "translations.publish",
    ],
  },
  {
    key: "support",
    name: "Support",
    description: "Read-only operational support access.",
    isSystem: false,
    isProtected: true,
    permissionKeys: [
      "dashboard.read",
      "admin.access",
      "users.read",
      "roles.read",
      "audit.read",
      "organization.read",
      "translations.read",
    ],
  },
  {
    key: "coach",
    name: "Coach",
    description: "Reserved for future trainer and coaching workflows.",
    isSystem: false,
    isProtected: true,
    permissionKeys: memberPermissions,
  },
  {
    key: "premium-user",
    name: "Premium User",
    description: "Premium subscription member with advanced product access.",
    isSystem: false,
    isProtected: true,
    permissionKeys: memberPermissions,
  },
  {
    key: "standard-user",
    name: "Standard User",
    description: "Standard subscription member.",
    isSystem: false,
    isProtected: true,
    permissionKeys: memberPermissions,
  },
  {
    key: "free-user",
    name: "Free User",
    description: "Free-tier member with core tracking access.",
    isSystem: false,
    isProtected: true,
    permissionKeys: memberPermissions,
  },
] as const;

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: DEFAULT_ORGANIZATION.slug },
    update: {
      name: DEFAULT_ORGANIZATION.name,
      displayName: DEFAULT_ORGANIZATION.displayName,
      isActive: true,
    },
    create: DEFAULT_ORGANIZATION,
  });

  const permissionMap = new Map<string, string>();
  for (const [key, category, name] of permissions) {
    const permission = await prisma.permission.upsert({
      where: { key },
      update: { category, name },
      create: { key, category, name },
    });
    permissionMap.set(key, permission.id);
  }

  const roleMap = new Map<string, string>();
  for (const definition of roleDefinitions) {
    const role = await prisma.role.upsert({
      where: {
        organizationId_key: {
          organizationId: definition.isSystem ? null : organization.id,
          key: definition.key,
        },
      },
      update: {
        name: definition.name,
        description: definition.description,
        isSystem: definition.isSystem,
        isProtected: definition.isProtected,
        isActive: true,
      },
      create: {
        organizationId: definition.isSystem ? null : organization.id,
        key: definition.key,
        name: definition.name,
        description: definition.description,
        isSystem: definition.isSystem,
        isProtected: definition.isProtected,
      },
    });

    roleMap.set(definition.key, role.id);
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: definition.permissionKeys.map((permissionKey) => ({
        roleId: role.id,
        permissionId: permissionMap.get(permissionKey)!,
      })),
      skipDuplicates: true,
    });
  }

  const existingUsers = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  for (const [index, user] of existingUsers.entries()) {
    const membership = await prisma.organizationMembership.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId: organization.id } },
      update: { status: "ACTIVE" },
      create: { userId: user.id, organizationId: organization.id, status: "ACTIVE" },
    });

    const roleKeys = index === 0
      ? ["super-administrator", "organization-administrator"]
      : ["free-user"];

    for (const roleKey of roleKeys) {
      await prisma.membershipRole.upsert({
        where: { membershipId_roleId: { membershipId: membership.id, roleId: roleMap.get(roleKey)! } },
        update: {},
        create: { membershipId: membership.id, roleId: roleMap.get(roleKey)! },
      });
    }
  }

  console.log(`RBAC initialized for ${existingUsers.length} user(s) in ${organization.displayName}.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
