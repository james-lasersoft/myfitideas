import "dotenv/config";
import prisma from "../src/config/prisma.js";

const entitlementRows = [
  ["core.tracking", "tracking", "Core tracking"],
  ["progress.basic", "analytics", "Basic progress analytics"],
  ["progress.advanced", "analytics", "Advanced progress analytics"],
  ["photos.progress", "tracking", "Progress photos"],
  ["insights.ai", "intelligence", "AI transformation insights"],
  ["coach.tools", "coaching", "Coach tools"],
  ["data.export", "privacy", "Personal data export"],
] as const;

const planDefinitions = [
  ["free", "Free", "Core personal tracking.", ["core.tracking", "progress.basic"]],
  ["standard", "Standard", "Expanded tracking and data tools.", ["core.tracking", "progress.basic", "photos.progress", "data.export"]],
  ["premium", "Premium", "Advanced analytics and intelligence.", entitlementRows.map(([key]) => key)],
] as const;

const permissionRows = [
  ["billing.read", "billing", "View subscriptions and billing"],
  ["billing.manage", "billing", "Manage subscriptions and billing"],
  ["system.operations", "system", "Access system operations"],
  ["assignments.read", "assignments", "View staff data assignments"],
  ["assignments.manage", "assignments", "Manage staff data assignments"],
  ["impersonation.start", "security", "Start audited support impersonation"],
] as const;

async function ensureRole(
  organizationId: string,
  key: string,
  name: string,
  description: string,
  permissionKeys: string[],
  isSystem = false
) {
  const role = await prisma.role.upsert({
    where: { organizationId_key: { organizationId, key } },
    update: { name, description, isActive: true, isProtected: true, isSystem },
    create: { organizationId, key, name, description, isActive: true, isProtected: true, isSystem },
  });
  const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });
  await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
  await prisma.rolePermission.createMany({
    data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
    skipDuplicates: true,
  });
}

async function main() {
  const organization = await prisma.organization.findUniqueOrThrow({ where: { slug: "myfitideas" } });

  for (const [key, category, name] of permissionRows) {
    await prisma.permission.upsert({ where: { key }, update: { category, name }, create: { key, category, name } });
  }

  for (const [key, category, name] of entitlementRows) {
    await prisma.entitlement.upsert({ where: { key }, update: { category, name }, create: { key, category, name } });
  }

  for (const [key, name, description, entitlementKeys] of planDefinitions) {
    const plan = await prisma.subscriptionPlan.upsert({
      where: { key },
      update: { name, description, isActive: true },
      create: { key, name, description },
    });
    const entitlements = await prisma.entitlement.findMany({ where: { key: { in: [...entitlementKeys] } } });
    await prisma.planEntitlement.deleteMany({ where: { planId: plan.id } });
    await prisma.planEntitlement.createMany({
      data: entitlements.map((entitlement) => ({ planId: plan.id, entitlementId: entitlement.id })),
      skipDuplicates: true,
    });
  }

  const memberPermissions = [
    "dashboard.read", "measurements.read", "measurements.create", "measurements.update", "measurements.delete",
    "hydration.read", "hydration.create", "hydration.update", "hydration.delete", "profile.read", "profile.update", "progress.read",
  ];
  const contentPermissions = ["admin.access", "translations.read", "translations.edit", "translations.publish", "translations.manage_languages"];
  const supportPermissions = ["admin.access", "users.read", "roles.read", "audit.read", "organization.read", "assignments.read", "impersonation.start"];
  const billingPermissions = ["admin.access", "users.read", "billing.read", "billing.manage", "audit.read", "organization.read"];
  const systemPermissions = (await prisma.permission.findMany()).map((permission) => permission.key);

  await ensureRole(organization.id, "user", "User", "Customer account with personal tracking access.", memberPermissions);
  await ensureRole(organization.id, "coach", "Coach", "Coach with assigned-client access.", [...memberPermissions, "admin.access", "users.read", "assignments.read"]);
  await ensureRole(organization.id, "support-agent", "Support Agent", "Operational support with audited assignment and impersonation access.", supportPermissions);
  await ensureRole(organization.id, "content-admin", "Content Administrator", "Manages multilingual and product content.", contentPermissions);
  await ensureRole(organization.id, "billing-admin", "Billing Administrator", "Manages plans and subscriptions.", billingPermissions);
  await ensureRole(organization.id, "system-admin", "System Administrator", "Operates and monitors the platform.", systemPermissions.filter((key) => key !== "roles.delete"));
  await ensureRole(organization.id, "super-administrator", "Super Administrator", "Full platform access.", systemPermissions, true);

  const freePlan = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { key: "free" } });
  const users = await prisma.user.findMany({ select: { id: true } });
  for (const user of users) {
    const active = await prisma.userSubscription.findFirst({
      where: { userId: user.id, status: { in: ["ACTIVE", "TRIALING"] } },
    });
    if (!active) await prisma.userSubscription.create({ data: { userId: user.id, planId: freePlan.id, status: "ACTIVE" } });
  }

  console.log("Security roles, plans, entitlements, and default subscriptions initialized.");
}

main().then(() => prisma.$disconnect()).catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
