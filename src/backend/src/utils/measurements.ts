export const OUNCES_TO_ML = 29.5735295625;
export const POUNDS_TO_KG = 0.45359237;
export const INCHES_TO_CM = 2.54;

export type WeightUnit = "kg" | "lb";
export type LengthUnit = "cm" | "in";
export type HydrationUnit = "ml" | "oz";

export function toKilograms(value: number, unit: WeightUnit): number {
  return unit === "kg" ? value : value * POUNDS_TO_KG;
}

export function fromKilograms(value: number, unit: WeightUnit): number {
  return unit === "kg" ? value : value / POUNDS_TO_KG;
}

export function toCentimeters(value: number, unit: LengthUnit): number {
  return unit === "cm" ? value : value * INCHES_TO_CM;
}

export function fromCentimeters(value: number, unit: LengthUnit): number {
  return unit === "cm" ? value : value / INCHES_TO_CM;
}

export function toMilliliters(value: number, unit: HydrationUnit): number {
  return unit === "ml" ? value : value * OUNCES_TO_ML;
}

export function fromMilliliters(value: number, unit: HydrationUnit): number {
  return unit === "ml" ? value : value / OUNCES_TO_ML;
}

export function roundMeasurement(value: number): number {
  return Number(value.toFixed(2));
}
