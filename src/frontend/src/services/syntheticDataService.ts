import api from "./api";

export type SyntheticBodyProfile = "UNDERWEIGHT" | "NORMAL" | "OVERWEIGHT" | "OBESITY" | "ATHLETIC";
export type SyntheticSexReference = "MALE" | "FEMALE";
export type SyntheticTrend = "STABLE" | "LOSS" | "GAIN" | "RECOMPOSITION" | "IRREGULAR";

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
}

export interface SyntheticDataPreview {
  targetUser: SyntheticDataUser;
  periodDays: number;
  scenario: {
    sexReference: SyntheticSexReference;
    age: number;
    bodyProfile: SyntheticBodyProfile;
    trend: SyntheticTrend;
  };
  estimatedRecords: {
    weightEntries: number;
    measurementEntries: number;
    hydrationEntries: number;
    total: number;
  };
  generationEnabled: boolean;
  nextStep: string;
}

export async function getSyntheticDataUsers(search = ""): Promise<SyntheticDataUser[]> {
  const response = await api.get("/api/v1/admin/synthetic-data/users", { params: { search } });
  return response.data.users as SyntheticDataUser[];
}

export async function previewSyntheticData(input: SyntheticDataPreviewInput): Promise<SyntheticDataPreview> {
  const response = await api.post("/api/v1/admin/synthetic-data/preview", input);
  return response.data as SyntheticDataPreview;
}
