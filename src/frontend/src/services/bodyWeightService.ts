import axios from "axios";
import api from "./api";
import type { WeightUnit } from "./measurementService";

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

export interface BodyWeight {
  id: string;
  measurementSessionId: string | null;
  recordedAt: string;
  weight: number;
  weightKg: number;
  source: BodyWeightSource;
  notes: string | null;
  displayUnit: WeightUnit;
}

export interface CreateBodyWeightInput {
  weight: number;
  unit: WeightUnit;
  recordedAt?: string;
  notes?: string;
}

export async function createBodyWeight(input: CreateBodyWeightInput): Promise<BodyWeight> {
  const response = await api.post<{ weight: BodyWeight }>("/api/body-weight", {
    ...input,
    source: "MANUAL",
  });
  return response.data.weight;
}

export function getBodyWeightError(error: unknown): string {
  if (!axios.isAxiosError(error)) return "Unable to save body weight.";
  const data = error.response?.data as { error?: string } | undefined;
  return data?.error ?? "Unable to save body weight.";
}
