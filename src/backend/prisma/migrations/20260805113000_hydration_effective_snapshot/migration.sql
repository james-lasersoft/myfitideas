ALTER TABLE "hydration"
  ADD COLUMN IF NOT EXISTS "beverageType" TEXT NOT NULL DEFAULT 'water',
  ADD COLUMN IF NOT EXISTS "hydrationCoefficient" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS "effectiveAmountMl" DOUBLE PRECISION;

UPDATE "hydration"
SET "effectiveAmountMl" = "amountMl" * "hydrationCoefficient"
WHERE "effectiveAmountMl" IS NULL;

ALTER TABLE "hydration"
  ALTER COLUMN "effectiveAmountMl" SET NOT NULL;

ALTER TABLE "hydration"
  ADD CONSTRAINT "hydration_coefficient_range"
  CHECK ("hydrationCoefficient" > 0 AND "hydrationCoefficient" <= 1.0),
  ADD CONSTRAINT "hydration_effective_amount_nonnegative"
  CHECK ("effectiveAmountMl" >= 0 AND "effectiveAmountMl" <= "amountMl");

CREATE INDEX IF NOT EXISTS "hydration_user_beverage_loggedAt_idx"
  ON "hydration" ("userId", "beverageType", "loggedAt");
