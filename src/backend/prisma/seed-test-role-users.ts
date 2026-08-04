import "dotenv/config";
import bcrypt from "bcrypt";
import prisma from "../src/config/prisma.js";

const ORGANIZATION_SLUG = "myfitideas";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "MyFitIdeas-Test-2026!";

const testUsers = [
  { roleKey: "super-administrator", email: "phase6.super-admin@example.test", firstName: "Super", lastName: "Administrator" },
  { roleKey: "organization-administrator", email: "phase6.org-admin@example.test", firstName: "Organization", lastName: "Administrator" },
  { roleKey: "translator", email: "phase6.translator@example.test", firstName: "Translation", lastName: "Tester" },
  { roleKey: "support", email: "phase6.support@example.test", firstName: "Support", lastName: "Tester" },
  { roleKey: "coach", email: "phase6.coach@example.test", firstName: "Coach", lastName: "Tester" },
  { roleKey: "premium-user", email: "phase6.premium@example.test", firstName: "Premium", lastName: "Tester" },
  { roleKey: "standard-user", email: "phase6.standard@example.test", firstName: "Standard", lastName: "Tester" },
  { roleKey: "free-user", email: "phase6.free@example.test", firstName: "Free", lastName: "Tester" },
] as const;

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed development test users while NODE_ENV=production.");
  }

  const organization = await prisma.organization.findUnique({
    where: { slug: ORGANIZATION_SLUG },
  });
  if (!organization) {
    throw new Error("MyFitIdeas organization was not found. Run npm run seed:rbac first.");
  }

  const roles = await prisma.role.findMany({
    where: {
      organizationId: organization.id,
      key: { in: testUsers.map((entry) => entry.roleKey) },
      isActive: true,
    },
  });
  const roleByKey = new Map(roles.map((role) => [role.key, role]));
  const missingRoles = testUsers
    .map((entry) => entry.roleKey)
    .filter((roleKey) => !roleByKey.has(roleKey));
  if (missingRoles.length > 0) {
    throw new Error(`Missing required roles: ${missingRoles.join(", ")}. Run npm run seed:rbac first.`);
  }

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);

  for (const definition of testUsers) {
    const user = await prisma.user.upsert({
      where: { email: definition.email },
      update: {
        passwordHash,
        firstName: definition.firstName,
        lastName: definition.lastName,
        status: "ACTIVE",
        mustChangePassword: false,
        tokenVersion: { increment: 1 },
        mfaEnabled: false,
        mfaSecretEncrypted: null,
        mfaRecoveryCodeHashes: [],
      },
      create: {
        email: definition.email,
        passwordHash,
        firstName: definition.firstName,
        lastName: definition.lastName,
        status: "ACTIVE",
        mustChangePassword: false,
      },
    });

    const membership = await prisma.organizationMembership.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: organization.id,
        },
      },
      update: { status: "ACTIVE" },
      create: {
        userId: user.id,
        organizationId: organization.id,
        status: "ACTIVE",
      },
    });

    const role = roleByKey.get(definition.roleKey)!;
    await prisma.$transaction([
      prisma.userSession.deleteMany({ where: { userId: user.id } }),
      prisma.membershipRole.deleteMany({ where: { membershipId: membership.id } }),
      prisma.membershipRole.create({
        data: { membershipId: membership.id, roleId: role.id },
      }),
    ]);
  }

  console.log(`Created or refreshed ${testUsers.length} Phase 6 role-test users.`);
  console.log(`Password: ${TEST_PASSWORD}`);
  for (const definition of testUsers) {
    console.log(`${definition.roleKey}: ${definition.email}`);
  }
  console.log("Company-role accounts will be prompted to enroll in MFA at login.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
