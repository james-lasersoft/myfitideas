import axios from "axios";
import api from "./api";

export type HydrationUnit = "oz" | "ml";

export interface HydrationEntry {
  id: string;
  userId: string;
  amount: number;
  unit: HydrationUnit;
  amountMl: number;
  beverageType: string;
  hydrationCoefficient: number;
  effectiveAmountMl: number;
  effectiveAmount?: number;
  loggedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHydrationInput {
  amount: number;
  unit: HydrationUnit;
  beverageType?: string;
  loggedAt?: string;
  confirmAnomaly?: boolean;
}

export interface DailyHydrationTotal {
  date: string;
  timeZone?: string;
  totalMl: number;
  totalOz: number;
  effectiveTotalMl: number;
  effectiveTotalOz: number;
  entries: HydrationEntry[];
}

interface HydrationListResponse {
  hydration: HydrationEntry[];
}

interface HydrationGuardrailResponse {
  code?: string;
  error?: string;
  issues?: Array<{ code: string; message: string; severity: string }>;
  details?: { amountMl?: number; projectedDailyTotalMl?: number; date?: string };
}

export async function getHydrationEntries(): Promise<HydrationEntry[]> {
  const response = await api.get<HydrationListResponse>("/api/hydration");
  return response.data.hydration;
}

async function postHydration(input: CreateHydrationInput): Promise<HydrationEntry> {
  const beverageType = input.beverageType ?? localStorage.getItem("lastHydrationBeverage") ?? "water";
  const response = await api.post<{ message: string; hydration: HydrationEntry }>("/api/hydration", {
    ...input,
    beverageType,
  });
  return response.data.hydration;
}

export async function createHydrationEntry(input: CreateHydrationInput): Promise<HydrationEntry> {
  try {
    return await postHydration(input);
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 409) throw error;
    const data = error.response.data as HydrationGuardrailResponse;
    if (data.code !== "HYDRATION_CONFIRMATION_REQUIRED") throw error;
    const details = (data.issues ?? []).map((issue) => issue.message).join("\n");
    const confirmed = window.confirm(`${data.error ?? "Please confirm this unusual hydration entry."}\n\n${details}\n\nSave this hydration entry anyway?`);
    if (!confirmed) throw new Error("HYDRATION_REVIEW_REQUESTED", { cause: error });
    return postHydration({ ...input, confirmAnomaly: true });
  }
}

export function getHydrationError(error: unknown): string {
  if (error instanceof Error && error.message === "HYDRATION_REVIEW_REQUESTED") return "Hydration entry was not saved. Review the amount and unit.";
  if (!axios.isAxiosError(error)) return "Unable to save hydration entry.";
  const data = error.response?.data as HydrationGuardrailResponse | undefined;
  return data?.error ?? "Unable to save hydration entry.";
}

export async function getDailyHydrationTotal(date?: string): Promise<DailyHydrationTotal> {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const response = await api.get<DailyHydrationTotal>("/api/hydration/daily-total", {
    params: { ...(date ? { date } : {}), ...(timeZone ? { timeZone } : {}) },
  });
  return response.data;
}

export async function deleteHydrationEntry(id: string): Promise<void> {
  await api.delete(`/api/hydration/${id}`);
}
