CREATE TYPE "BodyWeightSource" AS ENUM ('MANUAL','MEASUREMENT_SESSION','SMART_SCALE','APPLE_HEALTH','HEALTH_CONNECT','FITBIT','GARMIN','WITHINGS','IMPORT','SYNTHETIC');

CREATE TABLE "measurement_sessions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "measurement_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "body_weights" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "measurementSessionId" TEXT,
  "recordedAt" TIMESTAMP(3) NOT NULL,
  "weightKg" DOUBLE PRECISION NOT NULL,
  "source" "BodyWeightSource" NOT NULL DEFAULT 'MANUAL',
  "notes" TEXT,
  "syntheticBatchId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "body_weights_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "measurements"
  ADD COLUMN "measurementSessionId" TEXT,
  ADD COLUMN "bodyWeightId" TEXT,
  ADD COLUMN "calculationWeightKg" DOUBLE PRECISION;

INSERT INTO "measurement_sessions" ("id", "userId", "recordedAt", "createdAt", "updatedAt")
SELECT "id", "userId", "measurementDate", "createdAt", "updatedAt" FROM "measurements";

INSERT INTO "body_weights" ("id", "userId", "measurementSessionId", "recordedAt", "weightKg", "source", "syntheticBatchId", "createdAt", "updatedAt")
SELECT "id", "userId", "id", "measurementDate", "weightKg",
  CASE WHEN "syntheticBatchId" IS NULL THEN 'MEASUREMENT_SESSION'::"BodyWeightSource" ELSE 'SYNTHETIC'::"BodyWeightSource" END,
  "syntheticBatchId", "createdAt", "updatedAt"
FROM "measurements" WHERE "weightKg" IS NOT NULL;

UPDATE "measurements" SET
  "measurementSessionId" = "id",
  "bodyWeightId" = CASE WHEN "weightKg" IS NOT NULL THEN "id" ELSE NULL END,
  "calculationWeightKg" = "weightKg";

CREATE INDEX "measurement_sessions_userId_recordedAt_idx" ON "measurement_sessions"("userId", "recordedAt");
CREATE INDEX "body_weights_userId_recordedAt_idx" ON "body_weights"("userId", "recordedAt");
CREATE INDEX "body_weights_source_recordedAt_idx" ON "body_weights"("source", "recordedAt");
CREATE INDEX "body_weights_syntheticBatchId_idx" ON "body_weights"("syntheticBatchId");
CREATE UNIQUE INDEX "body_weights_measurementSessionId_key" ON "body_weights"("measurementSessionId") WHERE "measurementSessionId" IS NOT NULL;
CREATE UNIQUE INDEX "measurements_measurementSessionId_key" ON "measurements"("measurementSessionId") WHERE "measurementSessionId" IS NOT NULL;
CREATE UNIQUE INDEX "measurements_bodyWeightId_key" ON "measurements"("bodyWeightId") WHERE "bodyWeightId" IS NOT NULL;

ALTER TABLE "measurement_sessions" ADD CONSTRAINT "measurement_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "body_weights" ADD CONSTRAINT "body_weights_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "body_weights" ADD CONSTRAINT "body_weights_measurementSessionId_fkey" FOREIGN KEY ("measurementSessionId") REFERENCES "measurement_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_measurementSessionId_fkey" FOREIGN KEY ("measurementSessionId") REFERENCES "measurement_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_bodyWeightId_fkey" FOREIGN KEY ("bodyWeightId") REFERENCES "body_weights"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "body_weights" ADD CONSTRAINT "body_weights_weight_range" CHECK ("weightKg" >= 10 AND "weightKg" <= 635);
