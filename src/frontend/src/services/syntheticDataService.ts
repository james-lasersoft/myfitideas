import api from "./api";

export type SyntheticBodyProfile = "UNDERWEIGHT" | "NORMAL" | "OVERWEIGHT" | "OBESITY" | "ATHLETIC";
export type SyntheticSexReference = "MALE" | "FEMALE";
export type SyntheticTrend = "STABLE" | "LOSS" | "GAIN" | "RECOMPOSITION" | "IRREGULAR";
export type SyntheticAdherence = "PERFECT" | "REALISTIC" | "CHAOTIC";
export type SyntheticHydrationPattern = "HIGH" | "AVERAGE" | "LOW" | "WEEKEND";

export interface SyntheticDataUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
}

export interface SyntheticDataPreviewInput {
  userId: string;
  periodDays: 30 | 60 | 90;
  dailyWeight: boolean;
  weeklyMeasurements: boolean;
  dailyHydration: boolean;
  sexReference: SyntheticSexReference;
  age: number;
  bodyProfile: SyntheticBodyProfile;
  trend: SyntheticTrend;
  adherence: SyntheticAdherence;
  hydrationPattern: SyntheticHydrationPattern;
}

export interface SyntheticDataPreview {
  targetUser: SyntheticDataUser;
  periodDays: number;
  scenario: SyntheticDataPreviewInput;
  estimatedRecords: {
    weightEntries: number;
    measurementEntries: number;
    hydrationEntries: number;
    total: number;
  };
  generationEnabled: boolean;
}

export interface SyntheticDataBatch {
  id: string;
  targetUserId: string;
  seed: number;
  periodDays: number;
  sexReference: SyntheticSexReference;
  simulatedAge: number;
  bodyProfile: SyntheticBodyProfile;
  trend: SyntheticTrend;
  adherence: SyntheticAdherence;
  hydrationPattern: SyntheticHydrationPattern;
  dataTypes: Record<string, boolean>;
  recordCounts: {
    weightEntries: number;
    measurementEntries: number;
    hydrationEntries: number;
    total: number;
  };
  status: string;
  createdAt: string;
  email: string;
  firstName: string;
  lastName: string | null;
}

export async function getSyntheticDataUsers(search = ""): Promise<SyntheticDataUser[]> {
  const response = await api.get("/api/v1/admin/synthetic-data/users", { params: { search } });
  return response.data.users as SyntheticDataUser[];
}

export async function previewSyntheticData(input: SyntheticDataPreviewInput): Promise<SyntheticDataPreview> {
  const response = await api.post("/api/v1/admin/synthetic-data/preview", input);
  return response.data as SyntheticDataPreview;
}

export async function generateSyntheticData(input: SyntheticDataPreviewInput): Promise<{ batch: { id: string; seed: number; counts: SyntheticDataBatch["recordCounts"] } }> {
  const response = await api.post("/api/v1/admin/synthetic-data/generate", input);
  return response.data;
}

export async function getSyntheticDataBatches(): Promise<SyntheticDataBatch[]> {
  const response = await api.get("/api/v1/admin/synthetic-data/batches");
  return response.data.batches as SyntheticDataBatch[];
}

export async function deleteSyntheticDataBatch(batchId: string): Promise<void> {
  await api.delete(`/api/v1/admin/synthetic-data/batches/${batchId}`);
}
