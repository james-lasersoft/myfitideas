import api from "./api";

export type HydrationUnit = "oz" | "ml";

export interface HydrationEntry {
  id: string;
  userId: string;
  amount: number;
  unit: HydrationUnit;
  loggedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHydrationInput {
  amount: number;
  unit: HydrationUnit;
  loggedAt?: string;
}

export interface DailyHydrationTotal {
  date: string;
  timeZone?: string;
  totalMl: number;
  totalOz: number;
  entries: HydrationEntry[];
}

interface HydrationListResponse {
  hydration: HydrationEntry[];
}

export async function getHydrationEntries(): Promise<
  HydrationEntry[]
> {
  const response = await api.get<HydrationListResponse>(
    "/api/hydration"
  );

  return response.data.hydration;
}

export async function createHydrationEntry(
  input: CreateHydrationInput
): Promise<HydrationEntry> {
  const response = await api.post<{
    message: string;
    hydration: HydrationEntry;
  }>("/api/hydration", input);

  return response.data.hydration;
}

export async function getDailyHydrationTotal(
  date?: string
): Promise<DailyHydrationTotal> {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const response = await api.get<DailyHydrationTotal>(
    "/api/hydration/daily-total",
    {
      params: {
        ...(date ? { date } : {}),
        ...(timeZone ? { timeZone } : {}),
      },
    }
  );

  return response.data;
}

export async function deleteHydrationEntry(
  id: string
): Promise<void> {
  await api.delete(`/api/hydration/${id}`);
}
