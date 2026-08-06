import axios from "axios";
import api from "./api";

export type WeightUnit = "lb" | "kg";
export type LengthUnit = "in" | "cm";
export type BodyCompositionReference = "MALE" | "FEMALE";
export type BodyCompositionReferenceBasis = "BIRTH_SEX" | "HORMONE_THERAPY";
export type BodyWeightSource =
  | "MANUAL"
  | "MEASUREMENT_SESSION"
  | "SMART_SCALE"
  | "APPLE_HEALTH"
  | "HEALTH_CONNECT"
  | "FITBIT"
  | "GARMIN"
  | "WITHINGS"
  | "IMPORT"
  | "SYNTHETIC";

export interface MeasurementDisplayUnits {
  weight: WeightUnit;
  length: LengthUnit;
}

export interface MeasurementProfileMetrics {
  heightCm: number | null;
  height: number | null;
  displayUnit: LengthUnit;
  bodyCompositionReference: BodyCompositionReference | null;
  bodyCompositionReferenceBasis: BodyCompositionReferenceBasis | null;
  hasCompletedTwelveMonthsHormoneTherapy: boolean;
}

export interface BodyWeightEntry {
  id: string;
  measurementSessionId: string | null;
  recordedAt: string;
  weightKg: number;
  weight: number;
  source: BodyWeightSource;
  notes: string | null;
  displayUnit: WeightUnit;
}

export interface Measurement {
  id: string;
  measurementSessionId?: string | null;
  bodyWeightId?: string | null;
  calculationWeightKg?: number | null;
  weight: number | null;
  waist: number | null;
  chest: number | null;
  hips: number | null;
  neck: number | null;
  abdomen: number | null;
  leftBicep: number | null;
  rightBicep: number | null;
  leftForearm: number | null;
  rightForearm: number | null;
  leftThigh: number | null;
  rightThigh: number | null;
  leftCalf: number | null;
  rightCalf: number | null;
  bodyFat: number | null;
  bodyFatMethod: string | null;
  fatMass: number | null;
  leanMass: number | null;
  waistToHeightRatio: number | null;
  waistToHeightRatioMethod: string | null;
  measurementDate: string;
  displayUnits?: MeasurementDisplayUnits;
}

export interface CreateMeasurementInput {
  weight?: number;
  waist?: number;
  chest?: number;
  hips?: number;
  neck?: number;
  abdomen?: number;
  leftBicep?: number;
  rightBicep?: number;
  leftForearm?: number;
  rightForearm?: number;
  leftThigh?: number;
  rightThigh?: number;
  leftCalf?: number;
  rightCalf?: number;
  bodyFat?: number;
  weightUnit?: WeightUnit;
  lengthUnit?: LengthUnit;
  measurementDate?: string;
  confirmAnomaly?: boolean;
}

export interface GuardrailIssue {
  code: string;
  field: string;
  severity: "warning" | "confirmation_required";
  message: string;
  previousValue?: number;
  newValue: number;
  elapsedDays?: number;
  difference?: number;
  percentageChange?: number;
}

export interface MeasurementListResponse {
  weights: BodyWeightEntry[];
  measurementSessions: Measurement[];
  measurements: Measurement[];
  profileMetrics: MeasurementProfileMetrics;
}

export type MeasurementComparisonStatus =
  | "COMPARABLE"
  | "MISSING_BASELINE"
  | "MISSING_COMPARISON"
  | "MISSING_BOTH"
  | "ZERO_BASELINE";
export type MeasurementComparisonUnit = "cm" | "kg" | "percent" | "ratio";

export interface MeasurementComparisonValue {
  baselineValue: number | null;
  comparisonValue: number | null;
  displayUnit: MeasurementComparisonUnit;
  absoluteChange: number | null;
  percentageChange: number | null;
  status: MeasurementComparisonStatus;
}

export interface MeasurementSessionComparison {
  baselineSession: { id: string; recordedAt: string };
  comparisonSession: { id: string; recordedAt: string };
  coreMeasurements: Array<{
    field: "neck" | "chest" | "waist" | "abdomen" | "hips";
    value: MeasurementComparisonValue;
  }>;
  pairedMeasurements: Array<{
    field: "upperArms" | "forearms" | "thighs" | "calves";
    left: MeasurementComparisonValue;
    right: MeasurementComparisonValue;
  }>;
  calculatedMetrics: Array<{
    field: "bodyFat" | "waistToHeightRatio" | "fatMass" | "leanMass";
    value: MeasurementComparisonValue;
    baselineMethod: string | null;
    comparisonMethod: string | null;
  }>;
}

export async function getMeasurementData(): Promise<MeasurementListResponse> {
  const response = await api.get<MeasurementListResponse>("/api/measurements");
  return response.data;
}

export async function getMeasurements(): Promise<Measurement[]> {
  const data = await getMeasurementData();
  return data.measurementSessions ?? data.measurements;
}

export async function getMeasurementComparison(
  baselineSessionId: string,
  comparisonSessionId: string
): Promise<MeasurementSessionComparison> {
  const response = await api.get<MeasurementSessionComparison>("/api/measurements/compare", {
    params: { baselineSessionId, comparisonSessionId },
  });
  return response.data;
}

export function getMeasurementComparisonError(error: unknown): string {
  if (!axios.isAxiosError(error)) return "Unable to compare measurement sessions.";
  const data = error.response?.data as { code?: string } | undefined;
  if (data?.code === "IDENTICAL_MEASUREMENT_SESSION_IDS") return "Choose two different sessions to compare.";
  if (data?.code === "MEASUREMENT_SESSION_NOT_FOUND") return "One or both selected sessions are no longer available.";
  return "Unable to compare measurement sessions.";
}

export async function createMeasurement(input: CreateMeasurementInput): Promise<Measurement> {
  const response = await api.post<{ message: string; measurement: Measurement }>("/api/measurements", input);
  return response.data.measurement;
}

export function getMeasurementGuardrail(error: unknown): { message: string; issues: GuardrailIssue[] } | null {
  if (!axios.isAxiosError(error) || error.response?.status !== 409) return null;
  const data = error.response.data as { code?: string; error?: string; issues?: GuardrailIssue[] };
  if (data.code !== "MEASUREMENT_CONFIRMATION_REQUIRED") return null;
  return { message: data.error ?? "Please confirm this unusual measurement.", issues: data.issues ?? [] };
}

export function getMeasurementError(error: unknown): string {
  if (!axios.isAxiosError(error)) return "Unable to save measurement.";
  const data = error.response?.data as { error?: string } | undefined;
  return data?.error ?? "Unable to save measurement.";
}
