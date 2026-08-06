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
}

const CM_PER_INCH = 2.54;

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function calculateBodyComposition(input: BodyCompositionInput): BodyCompositionResult | null {
  if (!input.reference || !input.heightCm || !input.neckCm) return null;

  const heightIn = input.heightCm / CM_PER_INCH;
  const neckIn = input.neckCm / CM_PER_INCH;
  let densityDenominator: number;

  if (input.reference === "MALE") {
    const abdomenCm = input.abdomenCm ?? input.waistCm;
    if (!abdomenCm || abdomenCm <= input.neckCm) return null;
    const circumferenceDifferenceIn = (abdomenCm - input.neckCm) / CM_PER_INCH;
    densityDenominator = 1.0324
      - 0.19077 * Math.log10(circumferenceDifferenceIn)
      + 0.15456 * Math.log10(heightIn);
  } else {
    if (!input.waistCm || !input.hipsCm) return null;
    const circumferenceSumIn = (input.waistCm + input.hipsCm - input.neckCm) / CM_PER_INCH;
    if (circumferenceSumIn <= 0) return null;
    densityDenominator = 1.29579
      - 0.35004 * Math.log10(circumferenceSumIn)
      + 0.221 * Math.log10(heightIn);
  }

  const rawBodyFat = 495 / densityDenominator - 450;
  if (!Number.isFinite(rawBodyFat) || rawBodyFat < 2 || rawBodyFat > 75) return null;

  const bodyFat = round(rawBodyFat, 1);
  const weightKg = input.weightKg && input.weightKg > 0 ? input.weightKg : null;
  const fatMassKg = weightKg === null ? null : round(weightKg * bodyFat / 100);
  const leanMassKg = weightKg === null || fatMassKg === null ? null : round(weightKg - fatMassKg);

  return {
    bodyFat,
    bodyFatMethod: "US_NAVY_CIRCUMFERENCE",
    fatMassKg,
    leanMassKg,
  };
}
