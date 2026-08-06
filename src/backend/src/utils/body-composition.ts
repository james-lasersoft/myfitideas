export type BodyCompositionReference = "MALE" | "FEMALE";

export interface BodyCompositionInput {
  reference: BodyCompositionReference | null;
  heightCm: number | null;
  weightKg?: number | null;
  neckCm?: number | null;
  abdomenCm?: number | null;
  waistCm?: number | null;
  hipsCm?: number | null;
}

export interface BodyCompositionResult {
  bodyFat: number;
  bodyFatMethod: "US_NAVY_CIRCUMFERENCE";
  fatMassKg: number | null;
  leanMassKg: number | null;
  waistToHeightRatio: number | null;
  waistToHeightRatioMethod: "WAIST_CM_DIVIDED_BY_HEIGHT_CM" | null;
}

const CM_PER_INCH = 2.54;

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function calculateBmi(weightKg: number | null | undefined, heightCm: number | null | undefined): number | null {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return null;
  return round(weightKg / (heightCm / 100) ** 2, 1);
}

export function calculateWaistToHeightRatio(
  waistCm: number | null | undefined,
  heightCm: number | null | undefined,
): { value: number; method: "WAIST_CM_DIVIDED_BY_HEIGHT_CM" } | null {
  if (!waistCm || !heightCm || waistCm <= 0 || heightCm <= 0) return null;
  return {
    value: round(waistCm / heightCm, 4),
    method: "WAIST_CM_DIVIDED_BY_HEIGHT_CM",
  };
}

export function calculateBodyComposition(input: BodyCompositionInput): BodyCompositionResult | null {
  if (!input.reference || !input.heightCm || !input.neckCm) return null;

  const heightIn = input.heightCm / CM_PER_INCH;
  const neckIn = input.neckCm / CM_PER_INCH;
  let rawBodyFat: number;

  if (input.reference === "MALE") {
    const abdomenCm = input.abdomenCm ?? input.waistCm;
    if (!abdomenCm || abdomenCm <= input.neckCm) return null;
    const circumferenceDifferenceIn = abdomenCm / CM_PER_INCH - neckIn;
    rawBodyFat = 86.01 * Math.log10(circumferenceDifferenceIn)
      - 70.041 * Math.log10(heightIn)
      + 36.76;
  } else {
    if (!input.waistCm || !input.hipsCm) return null;
    const circumferenceSumIn = input.waistCm / CM_PER_INCH
      + input.hipsCm / CM_PER_INCH
      - neckIn;
    if (circumferenceSumIn <= 0) return null;
    rawBodyFat = 163.205 * Math.log10(circumferenceSumIn)
      - 97.684 * Math.log10(heightIn)
      - 78.387;
  }

  if (!Number.isFinite(rawBodyFat) || rawBodyFat < 2 || rawBodyFat > 75) return null;

  const bodyFat = round(rawBodyFat, 1);
  const weightKg = input.weightKg && input.weightKg > 0 ? input.weightKg : null;
  const fatMassKg = weightKg === null ? null : round(weightKg * bodyFat / 100);
  const leanMassKg = weightKg === null || fatMassKg === null ? null : round(weightKg - fatMassKg);
  const waistRatio = calculateWaistToHeightRatio(input.waistCm ?? input.abdomenCm, input.heightCm);

  return {
    bodyFat,
    bodyFatMethod: "US_NAVY_CIRCUMFERENCE",
    fatMassKg,
    leanMassKg,
    waistToHeightRatio: waistRatio?.value ?? null,
    waistToHeightRatioMethod: waistRatio?.method ?? null,
  };
}
