import prisma from "../config/prisma.js";
import { calculateBmi } from "../utils/body-composition.js";
import { fromCentimeters, fromKilograms, toCentimeters, toKilograms, type LengthUnit, type WeightUnit } from "../utils/measurements.js";

export const ANALYTICS_PERIODS = ["LAST_7_DAYS", "LAST_30_DAYS", "LAST_90_DAYS", "ALL_HISTORY", "CUSTOM"] as const;
export type AnalyticsPeriodType = (typeof ANALYTICS_PERIODS)[number];
export type AnalyticsUnitCode = LengthUnit | WeightUnit | "percent" | "ratio" | "kg_per_m2";
export type TrendDirection = "INCREASING" | "DECREASING" | "STABLE" | "INSUFFICIENT_DATA";
export type TrendReliability = "UNAVAILABLE" | "CURRENT_ONLY" | "BASIC_CHANGE" | "TREND_ELIGIBLE";
export interface AnalyticsPeriod { type: AnalyticsPeriodType; startDate: Date | null; endDate: Date; }
export interface MetricObservation { recordedAt: Date; value: number | null; unitCode: AnalyticsUnitCode; }
export interface BodyTransformationTrend {
  startValue: number | null; endValue: number | null; absoluteChange: number | null; percentageChange: number | null;
  unitCode: AnalyticsUnitCode; observationCount: number; startDate: string | null; endDate: string | null;
  direction: TrendDirection; reliability: TrendReliability;
}
export interface ConsistencySummary {
  observationCount: number; coveredIntervalCount: number; totalIntervalCount: number;
  coveragePercentage: number | null; intervalUnit: "DAY" | "WEEK";
}
export interface BodyTransformationAnalyticsResponse {
  period: { type: AnalyticsPeriodType; startDate: string | null; endDate: string };
  dataSufficiency: { bodyWeightObservationCount: number; measurementSessionCount: number; hasAnyData: boolean };
  weight: BodyTransformationTrend;
  coreMeasurements: Array<{ field: "neck" | "chest" | "waist" | "hips"; trend: BodyTransformationTrend }>;
  pairedMeasurements: Array<{ field: "upperArms" | "thighs" | "calves"; left: BodyTransformationTrend; right: BodyTransformationTrend }>;
  calculatedMetrics: Array<{ field: "bmi" | "bodyFat" | "waistToHeightRatio" | "fatMass" | "leanMass"; trend: BodyTransformationTrend }>;
  consistency: { bodyWeight: ConsistencySummary; measurementSessions: ConsistencySummary };
}
interface AnalyticsWeightRow { recordedAt: Date; weightKg: number; }
interface AnalyticsMeasurementRow {
  measurementDate: Date; neckCm: number | null; chestCm: number | null; waistCm: number | null; hipsCm: number | null;
  leftBicepCm: number | null; rightBicepCm: number | null; leftThighCm: number | null; rightThighCm: number | null;
  leftCalfCm: number | null; rightCalfCm: number | null; bodyFat: number | null; bodyFatMethod: string | null;
  waistToHeightRatio: number | null; waistToHeightRatioMethod: string | null; fatMassKg: number | null; leanMassKg: number | null;
}
function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
function unitFamily(unit: AnalyticsUnitCode): "length" | "weight" | "scalar" {
  if (unit === "cm" || unit === "in") return "length";
  if (unit === "kg" || unit === "lb") return "weight";
  return "scalar";
}
function normalizeValue(value: number, sourceUnit: AnalyticsUnitCode, targetUnit: AnalyticsUnitCode): number {
  if (unitFamily(sourceUnit) !== unitFamily(targetUnit)) throw new TypeError("Incompatible analytics units.");
  if (targetUnit === "cm" || targetUnit === "in") {
    if (sourceUnit !== "cm" && sourceUnit !== "in") throw new TypeError("Incompatible analytics length unit.");
    return round(fromCentimeters(toCentimeters(value, sourceUnit), targetUnit));
  }
  if (targetUnit === "kg" || targetUnit === "lb") {
    if (sourceUnit !== "kg" && sourceUnit !== "lb") throw new TypeError("Incompatible analytics weight unit.");
    return round(fromKilograms(toKilograms(value, sourceUnit), targetUnit));
  }
  if (sourceUnit !== targetUnit) throw new TypeError("Incompatible analytics scalar unit.");
  return round(value);
}
export function buildBodyTransformationTrend(observations: MetricObservation[], unitCode: AnalyticsUnitCode): BodyTransformationTrend {
  const available = observations
    .filter((observation): observation is MetricObservation & { value: number } => observation.value !== null && Number.isFinite(observation.value))
    .map((observation) => ({ recordedAt: observation.recordedAt, value: normalizeValue(observation.value, observation.unitCode, unitCode) }))
    .sort((left, right) => left.recordedAt.getTime() - right.recordedAt.getTime());
  const count = available.length;
  if (count === 0) return {
    startValue: null, endValue: null, absoluteChange: null, percentageChange: null, unitCode, observationCount: 0,
    startDate: null, endDate: null, direction: "INSUFFICIENT_DATA", reliability: "UNAVAILABLE",
  };
  const first = available[0]!;
  const last = available[count - 1]!;
  if (count === 1) return {
    startValue: first.value, endValue: first.value, absoluteChange: null, percentageChange: null, unitCode, observationCount: 1,
    startDate: first.recordedAt.toISOString(), endDate: first.recordedAt.toISOString(), direction: "INSUFFICIENT_DATA", reliability: "CURRENT_ONLY",
  };
  const absoluteChange = round(last.value - first.value);
  return {
    startValue: first.value, endValue: last.value, absoluteChange,
    percentageChange: first.value === 0 ? null : round((absoluteChange / first.value) * 100),
    unitCode, observationCount: count, startDate: first.recordedAt.toISOString(), endDate: last.recordedAt.toISOString(),
    direction: absoluteChange > 0 ? "INCREASING" : absoluteChange < 0 ? "DECREASING" : "STABLE",
    reliability: count >= 3 ? "TREND_ELIGIBLE" : "BASIC_CHANGE",
  };
}
function calendarDayStart(date: Date): number { return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()); }
function consistency(dates: Date[], intervalUnit: "DAY" | "WEEK", requestedStart: Date | null, requestedEnd: Date): ConsistencySummary {
  if (dates.length === 0) return { observationCount: 0, coveredIntervalCount: 0, totalIntervalCount: 0, coveragePercentage: null, intervalUnit };
  const sorted = [...dates].sort((left, right) => left.getTime() - right.getTime());
  const rangeStart = requestedStart ?? sorted[0]!;
  const rangeEnd = requestedStart ? requestedEnd : sorted[sorted.length - 1]!;
  const dayCount = Math.max(1, Math.floor((calendarDayStart(rangeEnd) - calendarDayStart(rangeStart)) / 86_400_000) + 1);
  const totalIntervalCount = intervalUnit === "DAY" ? dayCount : Math.ceil(dayCount / 7);
  const coveredIntervalCount = new Set(sorted.map((date) => {
    const dayOffset = Math.floor((calendarDayStart(date) - calendarDayStart(rangeStart)) / 86_400_000);
    return intervalUnit === "DAY" ? dayOffset : Math.floor(dayOffset / 7);
  })).size;
  return {
    observationCount: dates.length, coveredIntervalCount, totalIntervalCount,
    coveragePercentage: round((coveredIntervalCount / totalIntervalCount) * 100, 2), intervalUnit,
  };
}
const observed = (
  rows: AnalyticsMeasurementRow[], field: keyof AnalyticsMeasurementRow, unitCode: AnalyticsUnitCode,
  available?: (row: AnalyticsMeasurementRow) => boolean,
): MetricObservation[] => rows.map((row) => ({
  recordedAt: row.measurementDate, value: (!available || available(row)) ? row[field] as number | null : null, unitCode,
}));
export function buildBodyTransformationAnalytics(
  period: AnalyticsPeriod, weights: AnalyticsWeightRow[], measurements: AnalyticsMeasurementRow[],
  displayUnits: { weight: WeightUnit; length: LengthUnit; heightCm?: number | null },
): BodyTransformationAnalyticsResponse {
  const lengthTrend = (field: keyof AnalyticsMeasurementRow) =>
    buildBodyTransformationTrend(observed(measurements, field, "cm"), displayUnits.length);
  const calculatedTrend = (field: keyof AnalyticsMeasurementRow, unit: AnalyticsUnitCode, available?: (row: AnalyticsMeasurementRow) => boolean) =>
    buildBodyTransformationTrend(observed(measurements, field, unit, available), unit === "kg" ? displayUnits.weight : unit);
  const validBodyFat = (row: AnalyticsMeasurementRow) => row.bodyFat !== null && row.bodyFatMethod !== null;
  const observationDates = [
    ...weights.map((row) => row.recordedAt),
    ...measurements.map((row) => row.measurementDate),
  ].sort((left, right) => left.getTime() - right.getTime());
  const effectiveStartDate = period.startDate ?? observationDates[0] ?? null;
  return {
    period: { type: period.type, startDate: effectiveStartDate?.toISOString() ?? null, endDate: period.endDate.toISOString() },
    dataSufficiency: {
      bodyWeightObservationCount: weights.length, measurementSessionCount: measurements.length,
      hasAnyData: weights.length > 0 || measurements.length > 0,
    },
    weight: buildBodyTransformationTrend(weights.map((row) => ({ recordedAt: row.recordedAt, value: row.weightKg, unitCode: "kg" })), displayUnits.weight),
    coreMeasurements: [
      { field: "neck", trend: lengthTrend("neckCm") }, { field: "chest", trend: lengthTrend("chestCm") },
      { field: "waist", trend: lengthTrend("waistCm") }, { field: "hips", trend: lengthTrend("hipsCm") },
    ],
    pairedMeasurements: [
      { field: "upperArms", left: lengthTrend("leftBicepCm"), right: lengthTrend("rightBicepCm") },
      { field: "thighs", left: lengthTrend("leftThighCm"), right: lengthTrend("rightThighCm") },
      { field: "calves", left: lengthTrend("leftCalfCm"), right: lengthTrend("rightCalfCm") },
    ],
    calculatedMetrics: [
      { field: "bmi", trend: buildBodyTransformationTrend(weights.map((row) => ({
        recordedAt: row.recordedAt,
        value: calculateBmi(row.weightKg, displayUnits.heightCm),
        unitCode: "kg_per_m2",
      })), "kg_per_m2") },
      { field: "bodyFat", trend: calculatedTrend("bodyFat", "percent", validBodyFat) },
      { field: "waistToHeightRatio", trend: calculatedTrend("waistToHeightRatio", "ratio", (row) => row.waistToHeightRatioMethod !== null) },
      { field: "fatMass", trend: calculatedTrend("fatMassKg", "kg", validBodyFat) },
      { field: "leanMass", trend: calculatedTrend("leanMassKg", "kg", validBodyFat) },
    ],
    consistency: {
      bodyWeight: consistency(weights.map((row) => row.recordedAt), "DAY", period.startDate, period.endDate),
      measurementSessions: consistency(measurements.map((row) => row.measurementDate), "WEEK", period.startDate, period.endDate),
    },
  };
}
export async function getBodyTransformationAnalytics(userId: string, period: AnalyticsPeriod): Promise<BodyTransformationAnalyticsResponse> {
  const profile = await prisma.user.findUnique({ where: { id: userId }, select: { preferredWeightUnit: true, preferredLengthUnit: true, heightCm: true } });
  const startDate = period.startDate;
  const weights = startDate
    ? await prisma.$queryRaw<AnalyticsWeightRow[]>`
        SELECT "recordedAt", "weightKg" FROM "body_weights"
        WHERE "userId" = ${userId} AND "recordedAt" >= ${startDate} AND "recordedAt" <= ${period.endDate}
        ORDER BY "recordedAt" ASC
      `
    : await prisma.$queryRaw<AnalyticsWeightRow[]>`
        SELECT "recordedAt", "weightKg" FROM "body_weights"
        WHERE "userId" = ${userId} AND "recordedAt" <= ${period.endDate}
        ORDER BY "recordedAt" ASC
      `;
  const measurements = await prisma.measurement.findMany({
    where: { userId, measurementDate: { ...(startDate ? { gte: startDate } : {}), lte: period.endDate } },
    orderBy: { measurementDate: "asc" },
    select: {
      measurementDate: true, neckCm: true, chestCm: true, waistCm: true, hipsCm: true,
      leftBicepCm: true, rightBicepCm: true, leftThighCm: true, rightThighCm: true, leftCalfCm: true, rightCalfCm: true,
      bodyFat: true, bodyFatMethod: true, waistToHeightRatio: true, waistToHeightRatioMethod: true, fatMassKg: true, leanMassKg: true,
    },
  });
  return buildBodyTransformationAnalytics(period, weights, measurements, {
    weight: profile?.preferredWeightUnit === "kg" ? "kg" : "lb",
    length: profile?.preferredLengthUnit === "cm" ? "cm" : "in",
    heightCm: profile?.heightCm ?? null,
  });
}
