import api from "./api";

export interface Measurement {
  id: string;
  weight: number | null;
  waist: number | null;
  chest: number | null;
  hips: number | null;
  bodyFat: number | null;
  measurementDate: string;
  displayUnits?: {
    weight: "lb" | "kg";
    length: "in" | "cm";
  };
}

export interface CreateMeasurementInput {
  weight?: number;
  waist?: number;
  chest?: number;
  hips?: number;
  bodyFat?: number;
}

interface MeasurementListResponse {
  measurements: Measurement[];
}

export async function getMeasurements(): Promise<Measurement[]> {
  const response = await api.get<MeasurementListResponse>(
    "/api/measurements"
  );

  return response.data.measurements;
}

export async function createMeasurement(
  input: CreateMeasurementInput
): Promise<Measurement> {
  const response = await api.post<{
    message: string;
    measurement: Measurement;
  }>("/api/measurements", input);

  return response.data.measurement;
}
