ALTER TABLE "measurements"
  ADD COLUMN IF NOT EXISTS "waistToHeightRatio" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "waistToHeightRatioMethod" TEXT;

COMMENT ON COLUMN "measurements"."waistToHeightRatio" IS
  'Historical waist circumference divided by profile height, using canonical centimeters.';

COMMENT ON COLUMN "measurements"."waistToHeightRatioMethod" IS
  'Calculation method identifier retained with the historical result.';
