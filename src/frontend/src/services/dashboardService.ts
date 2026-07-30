import api from "./api";

export interface DashboardSummary {
  currentWeight: number | null;
  previousWeight: number | null;
  weightDifference: number | null;
  bmi: number | null;
  bmiCategory: string | null;
  todayWaterOz: number;
  todayWaterMl: number;
  lastMeasurementDate: string | null;
  preferredWeightUnit: "lb" | "kg";
  preferredHydrationUnit: "oz" | "ml";
  dailyHydrationGoal: number;
  targetWeight: number | null;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await api.get<DashboardSummary>(
    "/api/dashboard"
  );

  return response.data;
}
