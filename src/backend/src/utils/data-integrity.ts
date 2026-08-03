export type GuardrailSeverity = "warning" | "confirmation_required";

export interface GuardrailIssue {
  code: string;
  field: string;
  severity: GuardrailSeverity;
  message: string;
  previousValue?: number;
  newValue: number;
  elapsedDays?: number;
  difference?: number;
  percentageChange?: number;
}

export interface CanonicalMeasurementInput {
  weightKg?: number;
  waistCm?: number;
  chestCm?: number;
  hipsCm?: number;
  bodyFat?: number;
  measurementDate: Date;
}

export interface PreviousCanonicalMeasurement {
  weightKg: number | null;
  waistCm: number | null;
  chestCm: number | null;
  hipsCm: number | null;
  bodyFat: number | null;
  measurementDate: Date;
}

const DAY_MS = 86_400_000;
const MAX_FUTURE_SKEW_MS = 5 * 60_000;

export function validateMeasurementDate(date: Date): string | null {
  if (Number.isNaN(date.getTime())) return "The measurement date is invalid.";
  if (date.getTime() > Date.now() + MAX_FUTURE_SKEW_MS) return "Measurement dates cannot be in the future.";
  if (date.getUTCFullYear() < 1900) return "Measurement dates before 1900 are not supported.";
  return null;
}

export function validateMeasurementRanges(input: CanonicalMeasurementInput): string[] {
  const errors: string[] = [];
  if (input.weightKg !== undefined && (input.weightKg < 25 || input.weightKg > 450)) errors.push("Weight must be between 25 and 450 kg.");
  for (const [label, value] of [["Waist", input.waistCm], ["Chest", input.chestCm], ["Hips", input.hipsCm]] as const) {
    if (value !== undefined && (value < 30 || value > 300)) errors.push(`${label} must be between 30 and 300 cm.`);
  }
  if (input.bodyFat !== undefined && (input.bodyFat < 2 || input.bodyFat > 75)) errors.push("Body fat must be between 2% and 75%.");
  return errors;
}

function elapsedDaysBetween(current: Date, previous: Date): number {
  return Math.max(1, Math.abs(current.getTime() - previous.getTime()) / DAY_MS);
}

function weeklyAllowance(base: number, perWeek: number, elapsedDays: number): number {
  const weeks = Math.min(8, Math.max(1, elapsedDays / 7));
  return Math.max(base, perWeek * weeks);
}

export function compareMeasurementChange(
  input: CanonicalMeasurementInput,
  previous: PreviousCanonicalMeasurement | null
): GuardrailIssue[] {
  if (!previous) return [];
  const elapsedDays = elapsedDaysBetween(input.measurementDate, previous.measurementDate);
  const issues: GuardrailIssue[] = [];

  if (input.weightKg !== undefined && previous.weightKg && previous.weightKg > 0) {
    const difference = Math.abs(input.weightKg - previous.weightKg);
    const percentageChange = (difference / previous.weightKg) * 100;
    const weeklyPercent = percentageChange / Math.max(1, elapsedDays / 7);
    if (weeklyPercent > 10 || percentageChange > 25) {
      issues.push({ code: "UNUSUAL_WEIGHT_CHANGE", field: "weight", severity: "confirmation_required", message: "This weight differs substantially from the nearest previous entry. Verify the value and unit.", previousValue: previous.weightKg, newValue: input.weightKg, elapsedDays, difference, percentageChange });
    } else if (weeklyPercent > 5) {
      issues.push({ code: "RAPID_WEIGHT_CHANGE", field: "weight", severity: "warning", message: "This weight change is faster than expected for the elapsed time.", previousValue: previous.weightKg, newValue: input.weightKg, elapsedDays, difference, percentageChange });
    }
  }

  const circumferenceFields = [
    ["waist", input.waistCm, previous.waistCm],
    ["chest", input.chestCm, previous.chestCm],
    ["hips", input.hipsCm, previous.hipsCm],
  ] as const;
  for (const [field, next, prior] of circumferenceFields) {
    if (next === undefined || prior === null) continue;
    const difference = Math.abs(next - prior);
    const warnAt = weeklyAllowance(5, 7.5, elapsedDays);
    const confirmAt = weeklyAllowance(10, 15, elapsedDays);
    if (difference > confirmAt) {
      issues.push({ code: "UNUSUAL_BODY_MEASUREMENT_CHANGE", field, severity: "confirmation_required", message: `This ${field} measurement differs substantially from the nearest previous entry.`, previousValue: prior, newValue: next, elapsedDays, difference });
    } else if (difference > warnAt) {
      issues.push({ code: "BODY_MEASUREMENT_CHANGE_WARNING", field, severity: "warning", message: `This ${field} change is larger than expected across the elapsed weeks.`, previousValue: prior, newValue: next, elapsedDays, difference });
    }
  }

  if (input.bodyFat !== undefined && previous.bodyFat !== null) {
    const difference = Math.abs(input.bodyFat - previous.bodyFat);
    const warnAt = weeklyAllowance(3, 4, elapsedDays);
    const confirmAt = weeklyAllowance(6, 8, elapsedDays);
    if (difference > confirmAt) {
      issues.push({ code: "UNUSUAL_BODY_FAT_CHANGE", field: "bodyFat", severity: "confirmation_required", message: "This body-fat change is unusually large for the elapsed time.", previousValue: previous.bodyFat, newValue: input.bodyFat, elapsedDays, difference });
    } else if (difference > warnAt) {
      issues.push({ code: "BODY_FAT_CHANGE_WARNING", field: "bodyFat", severity: "warning", message: "This body-fat change is larger than expected across the elapsed weeks.", previousValue: previous.bodyFat, newValue: input.bodyFat, elapsedDays, difference });
    }
  }

  return issues;
}

export function validateHydrationDate(date: Date): string | null {
  if (Number.isNaN(date.getTime())) return "The hydration date is invalid.";
  if (date.getTime() > Date.now() + MAX_FUTURE_SKEW_MS) return "Hydration entries cannot be dated in the future.";
  if (date.getUTCFullYear() < 2000) return "Hydration entries before 2000 are not supported.";
  return null;
}

export function validateHydrationAmountMl(amountMl: number): string | null {
  if (!Number.isFinite(amountMl) || amountMl <= 0) return "Hydration amount must be a positive number.";
  if (amountMl > 3785.41) return "A single hydration entry cannot exceed 128 oz or 3,785 ml.";
  return null;
}
