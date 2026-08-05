-- Catch-up migration for databases created before session geolocation fields were introduced.
-- All columns are nullable because existing sessions may not have location metadata.

ALTER TABLE "user_sessions"
  ADD COLUMN IF NOT EXISTS "countryCode" TEXT,
  ADD COLUMN IF NOT EXISTS "region" TEXT,
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "locationSource" TEXT,
  ADD COLUMN IF NOT EXISTS "locationCapturedAt" TIMESTAMP(3);
