CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');
CREATE TYPE "AssignmentType" AS ENUM ('COACH', 'SUPPORT');

ALTER TABLE "users"
  ADD COLUMN "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "mfaSecretEncrypted" TEXT,
  ADD COLUMN "mfaRecoveryCodeHashes" JSONB;

ALTER TABLE "user_sessions"
  ADD COLUMN "refreshTokenHash" TEXT,
  ADD COLUMN "refreshExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "user_sessions_refreshTokenHash_key" ON "user_sessions"("refreshTokenHash");
CREATE INDEX "user_sessions_refreshExpiresAt_idx" ON "user_sessions"("refreshExpiresAt");

CREATE TABLE "entitlements" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "entitlements_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "entitlements_key_key" ON "entitlements"("key");
CREATE INDEX "entitlements_category_idx" ON "entitlements"("category");

CREATE TABLE "subscription_plans" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "subscription_plans_key_key" ON "subscription_plans"("key");
CREATE INDEX "subscription_plans_isActive_idx" ON "subscription_plans"("isActive");

CREATE TABLE "plan_entitlements" (
  "planId" TEXT NOT NULL,
  "entitlementId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "plan_entitlements_pkey" PRIMARY KEY ("planId", "entitlementId")
);
CREATE INDEX "plan_entitlements_entitlementId_idx" ON "plan_entitlements"("entitlementId");

CREATE TABLE "user_subscriptions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "user_subscriptions_userId_status_idx" ON "user_subscriptions"("userId", "status");
CREATE INDEX "user_subscriptions_planId_status_idx" ON "user_subscriptions"("planId", "status");

CREATE TABLE "data_assignments" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "staffUserId" TEXT NOT NULL,
  "subjectUserId" TEXT NOT NULL,
  "assignmentType" "AssignmentType" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "data_assignments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "data_assignments_org_staff_subject_type_key" ON "data_assignments"("organizationId", "staffUserId", "subjectUserId", "assignmentType");
CREATE INDEX "data_assignments_staff_active_idx" ON "data_assignments"("staffUserId", "isActive");
CREATE INDEX "data_assignments_subject_active_idx" ON "data_assignments"("subjectUserId", "isActive");

ALTER TABLE "plan_entitlements" ADD CONSTRAINT "plan_entitlements_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plan_entitlements" ADD CONSTRAINT "plan_entitlements_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "entitlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "data_assignments" ADD CONSTRAINT "data_assignments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "data_assignments" ADD CONSTRAINT "data_assignments_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "data_assignments" ADD CONSTRAINT "data_assignments_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_no_update
BEFORE UPDATE ON "audit_logs"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

CREATE TRIGGER audit_logs_no_delete
BEFORE DELETE ON "audit_logs"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
