ALTER TABLE "user_sessions"
ADD COLUMN "locationCity" TEXT,
ADD COLUMN "locationRegion" TEXT,
ADD COLUMN "locationCountry" TEXT,
ADD COLUMN "locationCountryCode" TEXT,
ADD COLUMN "locationTimezone" TEXT,
ADD COLUMN "locationLatitude" DOUBLE PRECISION,
ADD COLUMN "locationLongitude" DOUBLE PRECISION,
ADD COLUMN "locationProvider" TEXT,
ADD COLUMN "locationLookedUpAt" TIMESTAMP(3);

CREATE INDEX "user_sessions_locationCountryCode_idx"
ON "user_sessions"("locationCountryCode");
