-- Normalize the legacy user subscription start column to the canonical Prisma field.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_subscriptions'
      AND column_name = 'startsAt'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_subscriptions'
      AND column_name = 'startedAt'
  ) THEN
    ALTER TABLE "user_subscriptions" RENAME COLUMN "startsAt" TO "startedAt";
  END IF;
END $$;

ALTER TABLE "user_subscriptions"
  ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3);

UPDATE "user_subscriptions"
SET "startedAt" = COALESCE("startedAt", "createdAt", CURRENT_TIMESTAMP)
WHERE "startedAt" IS NULL;

ALTER TABLE "user_subscriptions"
  ALTER COLUMN "startedAt" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "startedAt" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "user_subscriptions_userId_status_startedAt_endsAt_idx"
  ON "user_subscriptions"("userId", "status", "startedAt", "endsAt");
