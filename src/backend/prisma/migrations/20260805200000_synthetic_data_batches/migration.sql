CREATE TABLE "synthetic_data_batches" (
  "id" TEXT NOT NULL,
  "targetUserId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "seed" INTEGER NOT NULL,
  "periodDays" INTEGER NOT NULL,
  "sexReference" TEXT NOT NULL,
  "simulatedAge" INTEGER NOT NULL,
  "bodyProfile" TEXT NOT NULL,
  "trend" TEXT NOT NULL,
  "adherence" TEXT NOT NULL DEFAULT 'REALISTIC',
  "hydrationPattern" TEXT NOT NULL DEFAULT 'AVERAGE',
  "dataTypes" JSONB NOT NULL,
  "recordCounts" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "synthetic_data_batches_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "measurements" ADD COLUMN "syntheticBatchId" TEXT;
ALTER TABLE "hydration" ADD COLUMN "syntheticBatchId" TEXT;

CREATE INDEX "synthetic_data_batches_targetUserId_createdAt_idx"
  ON "synthetic_data_batches"("targetUserId", "createdAt");
CREATE INDEX "synthetic_data_batches_createdByUserId_createdAt_idx"
  ON "synthetic_data_batches"("createdByUserId", "createdAt");
CREATE INDEX "measurements_syntheticBatchId_idx"
  ON "measurements"("syntheticBatchId");
CREATE INDEX "hydration_syntheticBatchId_idx"
  ON "hydration"("syntheticBatchId");

ALTER TABLE "synthetic_data_batches"
  ADD CONSTRAINT "synthetic_data_batches_targetUserId_fkey"
  FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "synthetic_data_batches"
  ADD CONSTRAINT "synthetic_data_batches_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "measurements"
  ADD CONSTRAINT "measurements_syntheticBatchId_fkey"
  FOREIGN KEY ("syntheticBatchId") REFERENCES "synthetic_data_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hydration"
  ADD CONSTRAINT "hydration_syntheticBatchId_fkey"
  FOREIGN KEY ("syntheticBatchId") REFERENCES "synthetic_data_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "synthetic_data_batches"
  ADD CONSTRAINT "synthetic_data_batches_period_days_check"
  CHECK ("periodDays" IN (30, 60, 90));
ALTER TABLE "synthetic_data_batches"
  ADD CONSTRAINT "synthetic_data_batches_age_check"
  CHECK ("simulatedAge" BETWEEN 18 AND 90);
