-- Reconcile the active Prisma schema with both fresh Phase 7 databases and
-- populated development databases that contain abandoned-branch artifacts.
-- This migration is intentionally additive and preserves deferred alternatives.

DO $$
BEGIN
  CREATE TYPE "BodyWeightSource" AS ENUM (
    'MANUAL',
    'MEASUREMENT_SESSION',
    'SMART_SCALE',
    'APPLE_HEALTH',
    'HEALTH_CONNECT',
    'FITBIT',
    'GARMIN',
    'WITHINGS',
    'IMPORT',
    'SYNTHETIC'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "sexAssignedAtBirth" TEXT,
  ADD COLUMN IF NOT EXISTS "genderIdentity" TEXT,
  ADD COLUMN IF NOT EXISTS "usesGenderAffirmingHormones" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "hormoneTherapyStartDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "bodyCompositionEquationPreference" TEXT NOT NULL DEFAULT 'ASSIGNED_SEX_REFERENCE',
  ADD COLUMN IF NOT EXISTS "bodyCompositionEstimateConsent" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "measurements"
  ADD COLUMN IF NOT EXISTS "neck" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "abdomen" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "leftBicep" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "rightBicep" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "leftForearm" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "rightForearm" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "leftThigh" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "rightThigh" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "leftCalf" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "rightCalf" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "calculationMethod" TEXT,
  ADD COLUMN IF NOT EXISTS "calculationVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "fatFreeMassKg" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "equationReference" TEXT,
  ADD COLUMN IF NOT EXISTS "calculationInputs" JSONB,
  ADD COLUMN IF NOT EXISTS "syntheticBatchId" TEXT,
  ADD COLUMN IF NOT EXISTS "measurementSessionId" TEXT,
  ADD COLUMN IF NOT EXISTS "bodyWeightId" TEXT,
  ADD COLUMN IF NOT EXISTS "calculationWeightKg" DOUBLE PRECISION;

ALTER TABLE "hydration"
  ADD COLUMN IF NOT EXISTS "syntheticBatchId" TEXT;

ALTER TABLE "translation_keys"
  ADD COLUMN IF NOT EXISTS "description" TEXT;

ALTER TABLE "invitations"
  ADD COLUMN IF NOT EXISTS "acceptedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "acceptedById" TEXT;

ALTER TABLE "user_sessions"
  ADD COLUMN IF NOT EXISTS "locationCity" TEXT,
  ADD COLUMN IF NOT EXISTS "locationRegion" TEXT,
  ADD COLUMN IF NOT EXISTS "locationCountry" TEXT,
  ADD COLUMN IF NOT EXISTS "locationCountryCode" TEXT,
  ADD COLUMN IF NOT EXISTS "locationTimezone" TEXT,
  ADD COLUMN IF NOT EXISTS "locationLatitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "locationLongitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "locationProvider" TEXT,
  ADD COLUMN IF NOT EXISTS "locationLookedUpAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "countryCode" TEXT,
  ADD COLUMN IF NOT EXISTS "region" TEXT,
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "locationSource" TEXT,
  ADD COLUMN IF NOT EXISTS "locationCapturedAt" TIMESTAMP(3);

ALTER TABLE "data_assignments"
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "measurements"
  ALTER COLUMN "measurementDate" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "hydration"
  ALTER COLUMN "unit" SET DEFAULT 'oz',
  ALTER COLUMN "loggedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "translation_keys"
  ALTER COLUMN "category" SET DEFAULT 'general';

ALTER TABLE "user_sessions"
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "organization_settings"
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "data_assignments"
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "languages_enabled_idx"
  ON "languages"("enabled");

CREATE INDEX IF NOT EXISTS "audit_logs_targetType_targetId_idx"
  ON "audit_logs"("targetType", "targetId");

CREATE INDEX IF NOT EXISTS "translation_history_changedByUserId_changedAt_idx"
  ON "translation_history"("changedByUserId", "changedAt");

CREATE INDEX IF NOT EXISTS "user_subscriptions_userId_status_startedAt_endsAt_idx"
  ON "user_subscriptions"("userId", "status", "startedAt", "endsAt");

CREATE INDEX IF NOT EXISTS "user_sessions_expiresAt_idx"
  ON "user_sessions"("expiresAt");

CREATE INDEX IF NOT EXISTS "user_sessions_locationCountryCode_idx"
  ON "user_sessions"("locationCountryCode");

CREATE INDEX IF NOT EXISTS "user_sessions_userId_revokedAt_idx"
  ON "user_sessions"("userId", "revokedAt");

CREATE INDEX IF NOT EXISTS "data_assignments_staff_active_idx"
  ON "data_assignments"("staffUserId", "isActive");

CREATE INDEX IF NOT EXISTS "data_assignments_subject_active_idx"
  ON "data_assignments"("subjectUserId", "isActive");

CREATE INDEX IF NOT EXISTS "data_assignments_staffUserId_isActive_endsAt_idx"
  ON "data_assignments"("staffUserId", "isActive", "endsAt");

CREATE INDEX IF NOT EXISTS "data_assignments_subjectUserId_isActive_endsAt_idx"
  ON "data_assignments"("subjectUserId", "isActive", "endsAt");

CREATE INDEX IF NOT EXISTS "measurements_userId_idx"
  ON "measurements"("userId");

CREATE INDEX IF NOT EXISTS "measurements_syntheticBatchId_idx"
  ON "measurements"("syntheticBatchId");

CREATE INDEX IF NOT EXISTS "hydration_logs_userId_idx"
  ON "hydration"("userId");

CREATE INDEX IF NOT EXISTS "hydration_syntheticBatchId_idx"
  ON "hydration"("syntheticBatchId");

CREATE UNIQUE INDEX IF NOT EXISTS "body_weights_measurementSessionId_key"
  ON "body_weights"("measurementSessionId")
  WHERE "measurementSessionId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "measurements_measurementSessionId_key"
  ON "measurements"("measurementSessionId")
  WHERE "measurementSessionId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "measurements_bodyWeightId_key"
  ON "measurements"("bodyWeightId")
  WHERE "bodyWeightId" IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organization_settings_organizationId_fkey'
  ) THEN
    ALTER TABLE "organization_settings"
      ADD CONSTRAINT "organization_settings_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invitations_acceptedByUserId_fkey'
  ) THEN
    ALTER TABLE "invitations"
      ADD CONSTRAINT "invitations_acceptedByUserId_fkey"
      FOREIGN KEY ("acceptedByUserId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'measurements_syntheticBatchId_fkey'
  ) THEN
    ALTER TABLE "measurements"
      ADD CONSTRAINT "measurements_syntheticBatchId_fkey"
      FOREIGN KEY ("syntheticBatchId") REFERENCES "synthetic_data_batches"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'hydration_syntheticBatchId_fkey'
  ) THEN
    ALTER TABLE "hydration"
      ADD CONSTRAINT "hydration_syntheticBatchId_fkey"
      FOREIGN KEY ("syntheticBatchId") REFERENCES "synthetic_data_batches"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'measurement_sessions_userId_fkey'
  ) THEN
    ALTER TABLE "measurement_sessions"
      ADD CONSTRAINT "measurement_sessions_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'body_weights_userId_fkey'
  ) THEN
    ALTER TABLE "body_weights"
      ADD CONSTRAINT "body_weights_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'body_weights_measurementSessionId_fkey'
  ) THEN
    ALTER TABLE "body_weights"
      ADD CONSTRAINT "body_weights_measurementSessionId_fkey"
      FOREIGN KEY ("measurementSessionId") REFERENCES "measurement_sessions"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'measurements_measurementSessionId_fkey'
  ) THEN
    ALTER TABLE "measurements"
      ADD CONSTRAINT "measurements_measurementSessionId_fkey"
      FOREIGN KEY ("measurementSessionId") REFERENCES "measurement_sessions"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'measurements_bodyWeightId_fkey'
  ) THEN
    ALTER TABLE "measurements"
      ADD CONSTRAINT "measurements_bodyWeightId_fkey"
      FOREIGN KEY ("bodyWeightId") REFERENCES "body_weights"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname IN ('measurements_bodyFat_range', 'measurements_bodyFatEstimate_range')
  ) THEN
    ALTER TABLE "measurements"
      ADD CONSTRAINT "measurements_bodyFat_range"
      CHECK ("bodyFat" IS NULL OR ("bodyFat" >= 0 AND "bodyFat" <= 100));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'measurements_fatFreeMassKg_nonnegative'
  ) THEN
    ALTER TABLE "measurements"
      ADD CONSTRAINT "measurements_fatFreeMassKg_nonnegative"
      CHECK ("fatFreeMassKg" IS NULL OR "fatFreeMassKg" >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_sexAssignedAtBirth_allowed'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_sexAssignedAtBirth_allowed"
      CHECK (
        "sexAssignedAtBirth" IS NULL
        OR "sexAssignedAtBirth" IN ('FEMALE', 'MALE', 'INTERSEX', 'PREFER_NOT_TO_SAY')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_bodyCompositionEquationPreference_allowed'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_bodyCompositionEquationPreference_allowed"
      CHECK (
        "bodyCompositionEquationPreference" IN (
          'ASSIGNED_SEX_REFERENCE',
          'MALE_REFERENCE',
          'FEMALE_REFERENCE',
          'DO_NOT_CALCULATE'
        )
      );
  END IF;
END
$$;
