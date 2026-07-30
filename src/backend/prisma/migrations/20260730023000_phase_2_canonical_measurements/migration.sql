ALTER TABLE "users"
  ADD COLUMN "preferredLengthUnit" TEXT NOT NULL DEFAULT 'in',
  ADD COLUMN "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN "dailyHydrationGoalMl" DOUBLE PRECISION NOT NULL DEFAULT 1892.7,
  ADD COLUMN "targetWeightKg" DOUBLE PRECISION;

ALTER TABLE "measurements"
  ADD COLUMN "weightKg" DOUBLE PRECISION,
  ADD COLUMN "waistCm" DOUBLE PRECISION,
  ADD COLUMN "chestCm" DOUBLE PRECISION,
  ADD COLUMN "hipsCm" DOUBLE PRECISION;

ALTER TABLE "hydration_logs"
  ADD COLUMN "amountMl" DOUBLE PRECISION;

UPDATE "users"
SET "targetWeightKg" = CASE
  WHEN "targetWeight" IS NULL THEN NULL
  WHEN lower("preferredWeightUnit") = 'kg' THEN "targetWeight"
  ELSE "targetWeight" * 0.45359237
END,
"dailyHydrationGoalMl" = CASE
  WHEN lower("preferredHydrationUnit") = 'ml' THEN "dailyHydrationGoal"
  ELSE "dailyHydrationGoal" * 29.5735295625
END;

UPDATE "measurements" m
SET "weightKg" = CASE
  WHEN m."weight" IS NULL THEN NULL
  WHEN lower(u."preferredWeightUnit") = 'kg' THEN m."weight"
  ELSE m."weight" * 0.45359237
END,
"waistCm" = CASE WHEN m."waist" IS NULL THEN NULL ELSE m."waist" * 2.54 END,
"chestCm" = CASE WHEN m."chest" IS NULL THEN NULL ELSE m."chest" * 2.54 END,
"hipsCm" = CASE WHEN m."hips" IS NULL THEN NULL ELSE m."hips" * 2.54 END
FROM "users" u
WHERE u."id" = m."userId";

UPDATE "hydration_logs"
SET "amountMl" = CASE
  WHEN lower("unit") = 'ml' THEN "amount"
  ELSE "amount" * 29.5735295625
END;

ALTER TABLE "hydration_logs"
  ALTER COLUMN "amountMl" SET NOT NULL;
