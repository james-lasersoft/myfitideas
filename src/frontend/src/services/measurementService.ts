import axios from "axios";
import api from "./api";

export type WeightUnit = "lb" | "kg";
export type LengthUnit = "in" | "cm";

export interface MeasurementDisplayUnits {
  weight: WeightUnit;
  length: LengthUnit;
}

export interface Measurement {
  id: string;
  weight: number | null;
  waist: number | null;
  chest: number | null;
  hips: number | null;
  bodyFat: number | null;
  measurementDate: string;
  displayUnits?: MeasurementDisplayUnits;
}

export interface CreateMeasurementInput {
  weight?: number;
  waist?: number;
  chest?: number;
  hips?: number;
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

interface MeasurementListResponse {
  measurements: Measurement[];
}

export async function getMeasurements(): Promise<Measurement[]> {
  const response = await api.get<MeasurementListResponse>("/api/measurements");
  return response.data.measurements;
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
