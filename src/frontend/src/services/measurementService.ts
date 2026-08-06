import axios from "axios";
import api from "./api";

export type WeightUnit = "lb" | "kg";
export type LengthUnit = "in" | "cm";
export type BodyCompositionReference = "MALE" | "FEMALE";
export type BodyCompositionReferenceBasis = "BIRTH_SEX" | "HORMONE_THERAPY";

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
  source: string;
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

export async function getMeasurementData(): Promise<MeasurementListResponse> {
  const response = await api.get<MeasurementListResponse>("/api/measurements");
  return response.data;
}

export async function getMeasurements(): Promise<Measurement[]> {
  const data = await getMeasurementData();
  return data.measurementSessions ?? data.measurements;
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
