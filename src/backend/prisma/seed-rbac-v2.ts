import "dotenv/config";
import prisma from "../src/config/prisma.js";

const permissionRows = [
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

const member = permissionRows.map(([key]) => key).filter((key) => !key.startsWith("admin.") && !key.startsWith("translations.") && !key.startsWith("users.") && !key.startsWith("roles.") && !key.startsWith("audit.") && !key.startsWith("organization."));

const definitions = [
  ["super-administrator", "Super Administrator", "Full platform and organization access.", permissionRows.map(([key]) => key), true],
  ["organization-administrator", "Organization Administrator", "Manages organization users, roles, translations, and settings.", permissionRows.map(([key]) => key).filter((key) => key !== "roles.delete"), true],
  ["translator", "Translator", "Reviews, edits, and publishes multilingual interface content.", [...member, "admin.access", "translations.read", "translations.edit", "translations.publish"], true],
  ["support", "Support", "Read-only operational support access.", ["dashboard.read", "admin.access", "users.read", "roles.read", "audit.read", "organization.read", "translations.read"], true],
  ["coach", "Coach", "Reserved for future trainer and coaching workflows.", member, true],
  ["premium-user", "Premium User", "Premium subscription member with advanced product access.", member, true],
  ["standard-user", "Standard User", "Standard subscription member.", member, true],
  ["free-user", "Free User", "Free-tier member with core tracking access.", member, true],
] as const;

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: "myfitideas" },
    update: { name: "myfitideas", displayName: "MyFitIdeas", isActive: true },
    create: { slug: "myfitideas", name: "myfitideas", displayName: "MyFitIdeas" },
  });

  const permissionIds = new Map<string, string>();
  for (const [key, category, name] of permissionRows) {
    const permission = await prisma.permission.upsert({ where: { key }, update: { category, name }, create: { key, category, name } });
    permissionIds.set(key, permission.id);
  }

  const roleIds = new Map<string, string>();
  for (const [key, name, description, keys, isProtected] of definitions) {
    const role = await prisma.role.upsert({
      where: { organizationId_key: { organizationId: organization.id, key } },
      update: { name, description, isSystem: key === "super-administrator", isProtected, isActive: true },
      create: { organizationId: organization.id, key, name, description, isSystem: key === "super-administrator", isProtected },
    });
    roleIds.set(key, role.id);
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({ data: keys.map((permissionKey) => ({ roleId: role.id, permissionId: permissionIds.get(permissionKey)! })), skipDuplicates: true });
  }

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  for (const [index, user] of users.entries()) {
    const membership = await prisma.organizationMembership.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId: organization.id } },
      update: { status: "ACTIVE" },
      create: { userId: user.id, organizationId: organization.id, status: "ACTIVE" },
    });
    const desired = index === 0 ? ["super-administrator", "organization-administrator"] : ["free-user"];
    for (const roleKey of desired) {
      const roleId = roleIds.get(roleKey)!;
      await prisma.membershipRole.upsert({ where: { membershipId_roleId: { membershipId: membership.id, roleId } }, update: {}, create: { membershipId: membership.id, roleId } });
    }
  }
  console.log(`RBAC initialized for ${users.length} user(s) in ${organization.displayName}.`);
}

main().then(() => prisma.$disconnect()).catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exit(1); });
