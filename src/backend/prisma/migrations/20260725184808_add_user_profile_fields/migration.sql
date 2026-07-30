-- AlterTable
ALTER TABLE "users" ADD COLUMN     "dailyHydrationGoal" DOUBLE PRECISION NOT NULL DEFAULT 64,
ADD COLUMN     "heightCm" DOUBLE PRECISION,
ADD COLUMN     "preferredHydrationUnit" TEXT NOT NULL DEFAULT 'oz',
ADD COLUMN     "preferredWeightUnit" TEXT NOT NULL DEFAULT 'lb',
ADD COLUMN     "targetWeight" DOUBLE PRECISION;
