import prisma from "../config/prisma.js";
import { toCentimeters, toKilograms, type LengthUnit, type WeightUnit } from "../utils/measurements.js";

export const COMPARISON_STATUSES = ["COMPARABLE", "MISSING_BASELINE", "MISSING_COMPARISON", "MISSING_BOTH", "ZERO_BASELINE"] as const;
export type MeasurementComparisonStatus = (typeof COMPARISON_STATUSES)[number];
export type MeasurementComparisonUnit = "cm" | "kg" | "percent" | "ratio";
export type MeasurementSourceUnit = LengthUnit | WeightUnit | "percent" | "ratio";

export interface MeasurementComparisonValue {
  baselineValue: number | null;
  comparisonValue: number | null;
  displayUnit: MeasurementComparisonUnit;
  absoluteChange: number | null;
  percentageChange: number | null;
  status: MeasurementComparisonStatus;
}
export interface CoreMeasurementComparison {
  field: "neck" | "chest" | "waist" | "abdomen" | "hips";
  value: MeasurementComparisonValue;
}
export interface PairedMeasurementComparison {
  field: "upperArms" | "forearms" | "thighs" | "calves";
  left: MeasurementComparisonValue;
  right: MeasurementComparisonValue;
}
export interface CalculatedMetricComparison {
  field: "bodyFat" | "waistToHeightRatio" | "fatMass" | "leanMass";
  value: MeasurementComparisonValue;
  baselineMethod: string | null;
  comparisonMethod: string | null;
}
export interface MeasurementSessionComparisonResponse {
  baselineSession: { id: string; recordedAt: string };
  comparisonSession: { id: string; recordedAt: string };
  coreMeasurements: CoreMeasurementComparison[];
  pairedMeasurements: PairedMeasurementComparison[];
  calculatedMetrics: CalculatedMetricComparison[];
}
export type MeasurementComparisonErrorCode = "IDENTICAL_MEASUREMENT_SESSION_IDS" | "MEASUREMENT_SESSION_NOT_FOUND";
export class MeasurementComparisonError extends Error {
  constructor(public readonly code: MeasurementComparisonErrorCode, public readonly statusCode: 400 | 404) {
    super(code);
  }
}

interface SourceValue { value: number | null | undefined; unit: MeasurementSourceUnit }
interface ComparisonSessionRow {
  id: string;
  measurementDate: Date;
  neckCm: number | null;
  chestCm: number | null;
  waistCm: number | null;
  abdomenCm: number | null;
  hipsCm: number | null;
  leftBicepCm: number | null;
  rightBicepCm: number | null;
  leftForearmCm: number | null;
  rightForearmCm: number | null;
  leftThighCm: number | null;
  rightThighCm: number | null;
  leftCalfCm: number | null;
  rightCalfCm: number | null;
  bodyFat: number | null;
  bodyFatMethod: string | null;
  waistToHeightRatio: number | null;
  waistToHeightRatioMethod: string | null;
  fatMassKg: number | null;
  leanMassKg: number | null;
}
function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
function normalize(source: SourceValue, displayUnit: MeasurementComparisonUnit): number | null {
  if (source.value == null) return null;
  if (displayUnit === "cm") {
    if (source.unit !== "cm" && source.unit !== "in") throw new Error("Incompatible length unit");
    return round(toCentimeters(source.value, source.unit));
  }
  if (displayUnit === "kg") {
    if (source.unit !== "kg" && source.unit !== "lb") throw new Error("Incompatible weight unit");
    return round(toKilograms(source.value, source.unit));
  }
  if (source.unit !== displayUnit) throw new Error("Incompatible scalar unit");
  return round(source.value);
}
export function compareMeasurementValues(
  baseline: SourceValue,
  comparison: SourceValue,
  displayUnit: MeasurementComparisonUnit
): MeasurementComparisonValue {
  const baselineValue = normalize(baseline, displayUnit);
  const comparisonValue = normalize(comparison, displayUnit);
  if (baselineValue == null && comparisonValue == null) {
    return { baselineValue, comparisonValue, displayUnit, absoluteChange: null, percentageChange: null, status: "MISSING_BOTH" };
  }
  if (baselineValue == null) {
    return { baselineValue, comparisonValue, displayUnit, absoluteChange: null, percentageChange: null, status: "MISSING_BASELINE" };
  }
  if (comparisonValue == null) {
    return { baselineValue, comparisonValue, displayUnit, absoluteChange: null, percentageChange: null, status: "MISSING_COMPARISON" };
  }
  const absoluteChange = round(comparisonValue - baselineValue);
  if (baselineValue === 0) {
    return { baselineValue, comparisonValue, displayUnit, absoluteChange, percentageChange: null, status: "ZERO_BASELINE" };
  }
  return {
    baselineValue,
    comparisonValue,
    displayUnit,
    absoluteChange,
    percentageChange: round((absoluteChange / baselineValue) * 100),
    status: "COMPARABLE",
  };
}
const length = (value: number | null): SourceValue => ({ value, unit: "cm" });
const weight = (value: number | null): SourceValue => ({ value, unit: "kg" });
const percentage = (value: number | null): SourceValue => ({ value, unit: "percent" });
const ratio = (value: number | null): SourceValue => ({ value, unit: "ratio" });

export function buildMeasurementSessionComparison(
  baseline: ComparisonSessionRow,
  comparison: ComparisonSessionRow
): MeasurementSessionComparisonResponse {
  const compareLength = (baselineValue: number | null, comparisonValue: number | null) =>
    compareMeasurementValues(length(baselineValue), length(comparisonValue), "cm");
  const compareWeight = (baselineValue: number | null, comparisonValue: number | null) =>
    compareMeasurementValues(weight(baselineValue), weight(comparisonValue), "kg");
  return {
    baselineSession: { id: baseline.id, recordedAt: baseline.measurementDate.toISOString() },
    comparisonSession: { id: comparison.id, recordedAt: comparison.measurementDate.toISOString() },
    coreMeasurements: [
      { field: "neck", value: compareLength(baseline.neckCm, comparison.neckCm) },
      { field: "chest", value: compareLength(baseline.chestCm, comparison.chestCm) },
      { field: "waist", value: compareLength(baseline.waistCm, comparison.waistCm) },
      { field: "abdomen", value: compareLength(baseline.abdomenCm, comparison.abdomenCm) },
      { field: "hips", value: compareLength(baseline.hipsCm, comparison.hipsCm) },
    ],
    pairedMeasurements: [
      { field: "upperArms", left: compareLength(baseline.leftBicepCm, comparison.leftBicepCm), right: compareLength(baseline.rightBicepCm, comparison.rightBicepCm) },
      { field: "forearms", left: compareLength(baseline.leftForearmCm, comparison.leftForearmCm), right: compareLength(baseline.rightForearmCm, comparison.rightForearmCm) },
      { field: "thighs", left: compareLength(baseline.leftThighCm, comparison.leftThighCm), right: compareLength(baseline.rightThighCm, comparison.rightThighCm) },
      { field: "calves", left: compareLength(baseline.leftCalfCm, comparison.leftCalfCm), right: compareLength(baseline.rightCalfCm, comparison.rightCalfCm) },
    ],
    calculatedMetrics: [
      { field: "bodyFat", value: compareMeasurementValues(percentage(baseline.bodyFat), percentage(comparison.bodyFat), "percent"), baselineMethod: baseline.bodyFatMethod, comparisonMethod: comparison.bodyFatMethod },
      { field: "waistToHeightRatio", value: compareMeasurementValues(ratio(baseline.waistToHeightRatio), ratio(comparison.waistToHeightRatio), "ratio"), baselineMethod: baseline.waistToHeightRatioMethod, comparisonMethod: comparison.waistToHeightRatioMethod },
      { field: "fatMass", value: compareWeight(baseline.fatMassKg, comparison.fatMassKg), baselineMethod: baseline.bodyFatMethod, comparisonMethod: comparison.bodyFatMethod },
      { field: "leanMass", value: compareWeight(baseline.leanMassKg, comparison.leanMassKg), baselineMethod: baseline.bodyFatMethod, comparisonMethod: comparison.bodyFatMethod },
    ],
  };
}
export async function compareMeasurementSessions(
  userId: string,
  baselineSessionId: string,
  comparisonSessionId: string
): Promise<MeasurementSessionComparisonResponse> {
  if (baselineSessionId === comparisonSessionId) {
    throw new MeasurementComparisonError("IDENTICAL_MEASUREMENT_SESSION_IDS", 400);
  }
  const rows = await prisma.measurement.findMany({
    where: { userId, id: { in: [baselineSessionId, comparisonSessionId] } },
  });
  const sessions = new Map(rows.map((row) => [row.id, row as ComparisonSessionRow]));
  const baseline = sessions.get(baselineSessionId);
  const comparison = sessions.get(comparisonSessionId);
  if (!baseline || !comparison) {
    throw new MeasurementComparisonError("MEASUREMENT_SESSION_NOT_FOUND", 404);
  }
  return buildMeasurementSessionComparison(baseline, comparison);
}
