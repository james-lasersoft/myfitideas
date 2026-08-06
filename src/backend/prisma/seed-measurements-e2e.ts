import "dotenv/config";
import bcrypt from "bcrypt";
import prisma from "../src/config/prisma.js";

const email = process.env.E2E_USER_EMAIL ?? "phase7.measurements.e2e@example.test";
const password = process.env.E2E_USER_PASSWORD ?? "MyFitIdeas-E2E-2026!";
const resetAuthSessions = process.env.E2E_RESET_AUTH_SESSIONS === "true";

const BASELINE_MEASUREMENT_ID = "10e2e000-0000-4000-8000-000000000001";
const COMPARISON_MEASUREMENT_ID = "10e2e000-0000-4000-8000-000000000002";
const BASELINE_SESSION_ID = "20e2e000-0000-4000-8000-000000000001";
const COMPARISON_SESSION_ID = "20e2e000-0000-4000-8000-000000000002";

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed Playwright data while NODE_ENV=production.");
  }
  if (!email.endsWith(".test")) {
    throw new Error("E2E_USER_EMAIL must use the reserved .test domain.");
  }

  const [organization, role, plan] = await Promise.all([
    prisma.organization.findUnique({ where: { slug: "myfitideas" } }),
    prisma.role.findFirst({ where: { key: "user", isActive: true, organization: { slug: "myfitideas" } } }),
    prisma.subscriptionPlan.findUnique({ where: { key: "free" } }),
  ]);
  if (!organization || !role || !plan) {
    throw new Error("Required organization, user role, or free plan is missing. Run npm run seed:rbac first.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      firstName: "Phase Seven",
      lastName: "Measurements",
      status: "ACTIVE",
      mustChangePassword: false,
      mfaEnabled: false,
      mfaSecretEncrypted: null,
      mfaRecoveryCodeHashes: [],
      heightCm: 175,
      bodyCompositionReference: "MALE",
      bodyCompositionReferenceBasis: "BIRTH_SEX",
      hasCompletedTwelveMonthsHormoneTherapy: false,
      preferredWeightUnit: "lb",
      preferredLengthUnit: "in",
      preferredHydrationUnit: "oz",
      preferredLanguage: "en",
      timezone: "America/Chicago",
      countryCode: "US",
    },
    create: {
      email,
      passwordHash,
      firstName: "Phase Seven",
      lastName: "Measurements",
      status: "ACTIVE",
      mustChangePassword: false,
      emailVerifiedAt: new Date(),
      heightCm: 175,
      bodyCompositionReference: "MALE",
      bodyCompositionReferenceBasis: "BIRTH_SEX",
      preferredWeightUnit: "lb",
      preferredLengthUnit: "in",
      preferredHydrationUnit: "oz",
      preferredLanguage: "en",
      timezone: "America/Chicago",
      countryCode: "US",
    },
  });

  const membership = await prisma.organizationMembership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: organization.id } },
    update: { status: "ACTIVE" },
    create: { userId: user.id, organizationId: organization.id, status: "ACTIVE" },
  });

  await prisma.$transaction([
    prisma.membershipRole.deleteMany({ where: { membershipId: membership.id } }),
    prisma.membershipRole.create({ data: { membershipId: membership.id, roleId: role.id } }),
    prisma.userSubscription.deleteMany({ where: { userId: user.id } }),
    prisma.userSubscription.create({ data: { userId: user.id, planId: plan.id, status: "ACTIVE" } }),
    prisma.measurement.deleteMany({ where: { userId: user.id } }),
  ]);

  await prisma.$executeRaw`DELETE FROM "body_weights" WHERE "userId" = ${user.id}`;
  await prisma.$executeRaw`DELETE FROM "measurement_sessions" WHERE "userId" = ${user.id}`;
  if (resetAuthSessions) {
    await prisma.userSession.deleteMany({ where: { userId: user.id } });
  }

  const baselineDate = new Date("2026-07-01T14:00:00.000Z");
  const comparisonDate = new Date("2026-07-15T14:00:00.000Z");
  await prisma.$executeRaw`
    INSERT INTO "measurement_sessions" ("id", "userId", "recordedAt", "createdAt", "updatedAt")
    VALUES
      (${BASELINE_SESSION_ID}, ${user.id}, ${baselineDate}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (${COMPARISON_SESSION_ID}, ${user.id}, ${comparisonDate}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;

  await prisma.measurement.createMany({
    data: [
      {
        id: BASELINE_MEASUREMENT_ID,
        userId: user.id,
        measurementDate: baselineDate,
        neckCm: 38.1,
        chestCm: 101.6,
        waistCm: 86.36,
        abdomenCm: 88.9,
        hipsCm: 96.52,
        leftBicepCm: 30.48,
        rightBicepCm: 31.75,
        leftForearmCm: 25.4,
        rightForearmCm: null,
        leftThighCm: 55.88,
        rightThighCm: 57.15,
        leftCalfCm: null,
        rightCalfCm: null,
        bodyFat: 20,
        bodyFatMethod: "US_NAVY_CIRCUMFERENCE",
        waistToHeightRatio: 0.4935,
        waistToHeightRatioMethod: "WAIST_CM_DIVIDED_BY_HEIGHT_CM",
        fatMassKg: 15,
        leanMassKg: 60,
      },
      {
        id: COMPARISON_MEASUREMENT_ID,
        userId: user.id,
        measurementDate: comparisonDate,
        neckCm: 39.37,
        chestCm: 104.14,
        waistCm: 83.82,
        abdomenCm: null,
        hipsCm: 99.06,
        leftBicepCm: 31.75,
        rightBicepCm: 33.02,
        leftForearmCm: 26.67,
        rightForearmCm: 27.94,
        leftThighCm: 57.15,
        rightThighCm: 58.42,
        leftCalfCm: 38.1,
        rightCalfCm: 39.37,
        bodyFat: 18,
        bodyFatMethod: "US_NAVY_CIRCUMFERENCE",
        waistToHeightRatio: 0.479,
        waistToHeightRatioMethod: "WAIST_CM_DIVIDED_BY_HEIGHT_CM",
        fatMassKg: 14,
        leanMassKg: 64,
      },
    ],
  });

  await prisma.$executeRaw`
    UPDATE "measurements"
    SET "measurementSessionId" = CASE
      WHEN "id" = ${BASELINE_MEASUREMENT_ID} THEN ${BASELINE_SESSION_ID}
      ELSE ${COMPARISON_SESSION_ID}
    END
    WHERE "id" IN (${BASELINE_MEASUREMENT_ID}, ${COMPARISON_MEASUREMENT_ID})
  `;

  console.log(`Reset deterministic measurement E2E data for ${email}.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
