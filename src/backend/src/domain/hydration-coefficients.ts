export const HYDRATION_COEFFICIENTS = {
  water: 1,
  coffee: 0.95,
  tea: 0.98,
  "sports-drink": 0.95,
  milk: 0.9,
  juice: 0.85,
  soda: 0.8,
  "sparkling-water": 1,
  "energy-drink": 0.8,
  smoothie: 0.85,
  "oral-rehydration": 1,
  other: 0.8,
} as const;

export type BeverageType = keyof typeof HYDRATION_COEFFICIENTS;

export function isBeverageType(value: string): value is BeverageType {
  return Object.prototype.hasOwnProperty.call(HYDRATION_COEFFICIENTS, value);
}

export function getHydrationCoefficient(beverageType: BeverageType): number {
  return HYDRATION_COEFFICIENTS[beverageType];
}
