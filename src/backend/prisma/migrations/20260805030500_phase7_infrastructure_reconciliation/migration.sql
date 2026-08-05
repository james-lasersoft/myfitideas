-- Phase 7 infrastructure reconciliation
--
-- This migration is intentionally idempotent. It brings development and
-- previously deployed databases forward to the canonical Phase 7 Prisma
-- contracts without replacing existing tables or deleting data.

-- Account lifecycle and localization fields.
ALTER TABLE IF EXISTS "users"
  ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "countryCode" TEXT NOT NULL DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "mfaSecretEncrypted" TEXT,
  ADD COLUMN IF NOT EXISTS "mfaRecoveryCodeHashes" JSONB;

-- Organization and membership lifecycle fields.
ALTER TABLE IF EXISTS "organizations"
  ADD COLUMN IF NOT EXISTS "displayName" TEXT,
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "organizations"
SET "displayName" = COALESCE("displayName", "name")
WHERE "displayName" IS NULL;

ALTER TABLE IF EXISTS "organization_memberships"
  ADD COLUMN IF NOT EXISTS "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Invitation lifecycle fields.
ALTER TABLE IF EXISTS "invitations"
  ADD COLUMN IF NOT EXISTS "acceptedById" TEXT,
  ADD COLUMN IF NOT EXISTS "acceptedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Translation publishing and editor tracking.
ALTER TABLE IF EXISTS "translation_values"
  ADD COLUMN IF NOT EXISTS "publishedValue" TEXT,
  ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "updatedById" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE IF EXISTS "translation_history"
  ADD COLUMN IF NOT EXISTS "previousValue" TEXT,
  ADD COLUMN IF NOT EXISTS "previousStatus" "TranslationStatus",
  ADD COLUMN IF NOT EXISTS "newStatus" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Session security, refresh-token, and geolocation fields.
ALTER TABLE IF EXISTS "user_sessions"
  ADD COLUMN IF NOT EXISTS "refreshTokenHash" TEXT,
  ADD COLUMN IF NOT EXISTS "refreshExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "countryCode" TEXT,
  ADD COLUMN IF NOT EXISTS "region" TEXT,
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "locationSource" TEXT,
  ADD COLUMN IF NOT EXISTS "locationCapturedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Audit context and state-diff fields.
ALTER TABLE IF EXISTS "audit_logs"
  ADD COLUMN IF NOT EXISTS "organizationId" TEXT,
  ADD COLUMN IF NOT EXISTS "actorUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "result" "AuditResult" NOT NULL DEFAULT 'SUCCESS',
  ADD COLUMN IF NOT EXISTS "ipAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "userAgent" TEXT,
  ADD COLUMN IF NOT EXISTS "requestId" TEXT,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB,
  ADD COLUMN IF NOT EXISTS "beforeState" JSONB,
  ADD COLUMN IF NOT EXISTS "afterState" JSONB;

-- Subscription lifecycle fields.
ALTER TABLE IF EXISTS "user_subscriptions"
  ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "endsAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Time-bounded staff data access.
ALTER TABLE IF EXISTS "data_assignments"
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "endsAt" TIMESTAMP(3);

-- Organization-scoped provider-neutral configuration.
CREATE TABLE IF NOT EXISTS "organization_settings" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_settings_pkey" PRIMARY KEY ("id")
);

-- Canonical indexes. Existing equivalent indexes are left untouched.
CREATE INDEX IF NOT EXISTS "users_status_idx" ON "users"("status");
CREATE INDEX IF NOT EXISTS "organizations_isActive_idx" ON "organizations"("isActive");
CREATE INDEX IF NOT EXISTS "organization_memberships_organizationId_status_idx" ON "organization_memberships"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "organization_memberships_userId_status_idx" ON "organization_memberships"("userId", "status");
CREATE INDEX IF NOT EXISTS "invitations_organizationId_status_idx" ON "invitations"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "invitations_email_status_idx" ON "invitations"("email", "status");
CREATE INDEX IF NOT EXISTS "invitations_expiresAt_idx" ON "invitations"("expiresAt");
CREATE INDEX IF NOT EXISTS "translation_values_languageId_status_idx" ON "translation_values"("languageId", "status");
CREATE INDEX IF NOT EXISTS "translation_values_updatedById_idx" ON "translation_values"("updatedById");
CREATE INDEX IF NOT EXISTS "translation_history_translationKeyId_changedAt_idx" ON "translation_history"("translationKeyId", "changedAt");
CREATE INDEX IF NOT EXISTS "translation_history_languageLocale_changedAt_idx" ON "translation_history"("languageLocale", "changedAt");
CREATE INDEX IF NOT EXISTS "user_sessions_userId_revokedAt_expiresAt_idx" ON "user_sessions"("userId", "revokedAt", "expiresAt");
CREATE INDEX IF NOT EXISTS "user_sessions_refreshExpiresAt_idx" ON "user_sessions"("refreshExpiresAt");
CREATE INDEX IF NOT EXISTS "audit_logs_organizationId_createdAt_idx" ON "audit_logs"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "audit_logs_actorUserId_createdAt_idx" ON "audit_logs"("actorUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");
CREATE INDEX IF NOT EXISTS "user_subscriptions_userId_status_idx" ON "user_subscriptions"("userId", "status");
CREATE INDEX IF NOT EXISTS "user_subscriptions_planId_status_idx" ON "user_subscriptions"("planId", "status");
CREATE INDEX IF NOT EXISTS "data_assignments_subjectUserId_isActive_endsAt_idx" ON "data_assignments"("subjectUserId", "isActive", "endsAt");
CREATE INDEX IF NOT EXISTS "data_assignments_staffUserId_isActive_endsAt_idx" ON "data_assignments"("staffUserId", "isActive", "endsAt");
CREATE INDEX IF NOT EXISTS "organization_settings_organizationId_category_idx" ON "organization_settings"("organizationId", "category");

CREATE UNIQUE INDEX IF NOT EXISTS "organization_settings_organizationId_key_key"
  ON "organization_settings"("organizationId", "key");

-- Unique indexes required by session token rotation.
CREATE UNIQUE INDEX IF NOT EXISTS "user_sessions_refreshTokenHash_key"
  ON "user_sessions"("refreshTokenHash")
  WHERE "refreshTokenHash" IS NOT NULL;
