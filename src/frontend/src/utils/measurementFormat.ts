export type MeasurementUnit = "ml" | "oz" | "lb" | "kg" | "in" | "cm" | "%";

export function getMeasurementPrecision(unit: MeasurementUnit): number {
  return unit === "ml" ? 0 : 1;
}

export function getMeasurementStep(unit: MeasurementUnit): string {
  return unit === "ml" ? "1" : "0.1";
}

export function roundMeasurementForUnit(
  value: number,
  unit: MeasurementUnit
): number {
  const precision = getMeasurementPrecision(unit);
  return Number(value.toFixed(precision));
}

export function formatMeasurement(
  value: number,
  unit: MeasurementUnit
): string {
  return value.toFixed(getMeasurementPrecision(unit));
}

export function formatMeasurementInput(
  value: number,
  unit: MeasurementUnit
): string {
  return roundMeasurementForUnit(value, unit).toString();
}
