-- Align the deployed database with the active Phase 6/7 backend contracts while preserving existing data.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'measurements' AND column_name = 'date'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'measurements' AND column_name = 'measurementDate'
  ) THEN
    ALTER TABLE "measurements" RENAME COLUMN "date" TO "measurementDate";
  END IF;
END $$;

ALTER TABLE "measurements" ALTER COLUMN "weight" DROP NOT NULL;

-- Earlier deployments used hydration_logs while the current Prisma model maps to hydration.
DO $$
BEGIN
  IF to_regclass('public.hydration') IS NULL AND to_regclass('public.hydration_logs') IS NOT NULL THEN
    ALTER TABLE "hydration_logs" RENAME TO "hydration";
  ELSIF to_regclass('public.hydration') IS NULL AND to_regclass('public."Hydration"') IS NOT NULL THEN
    ALTER TABLE "Hydration" RENAME TO "hydration";
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.hydration') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'hydration' AND column_name = 'date'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'hydration' AND column_name = 'loggedAt'
    ) THEN
      ALTER TABLE "hydration" RENAME COLUMN "date" TO "loggedAt";
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'hydration' AND column_name = 'amountMl'
    ) THEN
      ALTER TABLE "hydration" ADD COLUMN "amountMl" DOUBLE PRECISION;
    END IF;

    UPDATE "hydration"
    SET "amountMl" = CASE
      WHEN lower("unit") = 'ml' THEN "amount"
      WHEN lower("unit") = 'l' THEN "amount" * 1000
      WHEN lower("unit") IN ('oz', 'fl oz', 'floz') THEN "amount" * 29.5735295625
      WHEN lower("unit") = 'cup' THEN "amount" * 236.5882365
      ELSE "amount"
    END
    WHERE "amountMl" IS NULL;

    ALTER TABLE "hydration" ALTER COLUMN "amountMl" SET NOT NULL;
  ELSE
    RAISE EXCEPTION 'No supported hydration table was found (expected hydration or hydration_logs).';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invitations' AND column_name = 'createdById'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invitations' AND column_name = 'createdByUserId'
  ) THEN
    ALTER TABLE "invitations" RENAME COLUMN "createdById" TO "createdByUserId";
  END IF;
END $$;

ALTER TABLE "invitations" ALTER COLUMN "roleId" DROP NOT NULL;

ALTER TABLE "translation_values"
  ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

CREATE INDEX IF NOT EXISTS "translation_values_updatedById_idx"
  ON "translation_values"("updatedById");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'translation_values_updatedById_fkey'
  ) THEN
    ALTER TABLE "translation_values"
      ADD CONSTRAINT "translation_values_updatedById_fkey"
      FOREIGN KEY ("updatedById") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'translation_history' AND column_name = 'locale'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'translation_history' AND column_name = 'languageLocale'
  ) THEN
    ALTER TABLE "translation_history" RENAME COLUMN "locale" TO "languageLocale";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'translation_history' AND column_name = 'nextValue'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'translation_history' AND column_name = 'newValue'
  ) THEN
    ALTER TABLE "translation_history" RENAME COLUMN "nextValue" TO "newValue";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'translation_history' AND column_name = 'changedById'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'translation_history' AND column_name = 'changedByUserId'
  ) THEN
    ALTER TABLE "translation_history" RENAME COLUMN "changedById" TO "changedByUserId";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'translation_history' AND column_name = 'createdAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'translation_history' AND column_name = 'changedAt'
  ) THEN
    ALTER TABLE "translation_history" RENAME COLUMN "createdAt" TO "changedAt";
  END IF;
END $$;

ALTER TABLE "translation_history"
  ADD COLUMN IF NOT EXISTS "previousStatus" "TranslationStatus",
  ADD COLUMN IF NOT EXISTS "newStatus" "TranslationStatus";

UPDATE "translation_history"
SET "newStatus" = 'PUBLISHED'
WHERE "newStatus" IS NULL;

ALTER TABLE "translation_history" ALTER COLUMN "newStatus" SET NOT NULL;

ALTER TABLE "data_assignments"
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "endsAt" TIMESTAMP(3);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'data_assignments' AND column_name = 'revokedAt'
  ) THEN
    EXECUTE '
      UPDATE "data_assignments"
      SET
        "isActive" = CASE WHEN "revokedAt" IS NULL THEN true ELSE false END,
        "endsAt" = COALESCE("endsAt", "revokedAt")
    ';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "data_assignments_subjectUserId_isActive_endsAt_idx"
  ON "data_assignments"("subjectUserId", "isActive", "endsAt");
CREATE INDEX IF NOT EXISTS "data_assignments_staffUserId_isActive_endsAt_idx"
  ON "data_assignments"("staffUserId", "isActive", "endsAt");
