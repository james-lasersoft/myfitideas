import axios from "axios";
import api from "./api";

export type AnalyticsPeriod = "LAST_7_DAYS" | "LAST_30_DAYS" | "LAST_90_DAYS" | "ALL_HISTORY" | "CUSTOM";
export type AnalyticsUnitCode = "cm" | "in" | "kg" | "lb" | "percent" | "ratio" | "kg_per_m2";
export type TrendDirection = "INCREASING" | "DECREASING" | "STABLE" | "INSUFFICIENT_DATA";
export type TrendReliability = "UNAVAILABLE" | "CURRENT_ONLY" | "BASIC_CHANGE" | "TREND_ELIGIBLE";
export interface BodyTransformationTrend {
  startValue: number | null;
  endValue: number | null;
  absoluteChange: number | null;
  percentageChange: number | null;
  unitCode: AnalyticsUnitCode;
  observationCount: number;
  startDate: string | null;
  endDate: string | null;
  direction: TrendDirection;
  reliability: TrendReliability;
}
export interface ConsistencySummary {
  observationCount: number;
  coveredIntervalCount: number;
  totalIntervalCount: number;
  coveragePercentage: number | null;
  intervalUnit: "DAY" | "WEEK";
}
export interface BodyTransformationAnalytics {
  period: { type: AnalyticsPeriod; startDate: string | null; endDate: string };
  dataSufficiency: { bodyWeightObservationCount: number; measurementSessionCount: number; hasAnyData: boolean };
  weight: BodyTransformationTrend;
  coreMeasurements: Array<{ field: "neck" | "chest" | "waist" | "hips"; trend: BodyTransformationTrend }>;
  pairedMeasurements: Array<{ field: "upperArms" | "thighs" | "calves"; left: BodyTransformationTrend; right: BodyTransformationTrend }>;
  calculatedMetrics: Array<{ field: "bmi" | "bodyFat" | "waistToHeightRatio" | "fatMass" | "leanMass"; trend: BodyTransformationTrend }>;
  consistency: { bodyWeight: ConsistencySummary; measurementSessions: ConsistencySummary };
}
export interface AnalyticsQuery {
  period: AnalyticsPeriod;
  startDate?: string;
  endDate?: string;
}
export async function getBodyTransformationAnalytics(query: AnalyticsQuery): Promise<BodyTransformationAnalytics> {
  const response = await api.get<BodyTransformationAnalytics>("/api/v1/analytics/body-transformation", { params: query });
  return response.data;
}
export function getBodyTransformationAnalyticsError(error: unknown): string {
  if (!axios.isAxiosError(error)) return "Unable to load body transformation insights.";
  const code = (error.response?.data as { code?: string } | undefined)?.code;
  if (code === "ANALYTICS_DATE_RANGE_REQUIRED") return "Choose both a start date and an end date.";
  if (code === "INVALID_ANALYTICS_DATE_RANGE") return "Choose a valid date range that does not end in the future.";
  if (code === "INVALID_ANALYTICS_PERIOD") return "Choose a valid insight period.";
  return "Unable to load body transformation insights.";
}
