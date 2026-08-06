import type { CreateMeasurementInput, LengthUnit, WeightUnit } from "../../services/measurementService";
import { formatMeasurement } from "../../utils/measurementFormat";

export type EntryMode = "NEWBIE" | "NORMAL" | "PRO";
export type SessionField = Exclude<keyof CreateMeasurementInput, "weight" | "weightUnit" | "lengthUnit" | "measurementDate" | "confirmAnomaly" | "bodyFat">;

export interface WizardStep {
  title: string;
  description: string;
  fields: SessionField[];
}

export const FIELD_LABELS: Record<SessionField, string> = {
  waist: "Waist", chest: "Chest", hips: "Hips", neck: "Neck", abdomen: "Abdomen",
  leftBicep: "Left upper arm", rightBicep: "Right upper arm", leftForearm: "Left forearm",
  rightForearm: "Right forearm", leftThigh: "Left thigh", rightThigh: "Right thigh",
  leftCalf: "Left calf", rightCalf: "Right calf",
};

const GUIDANCE: Partial<Record<SessionField, string>> = {
  neck: "Place the tape below the larynx, level and snug without compressing the skin.",
  chest: "Measure around the fullest part of the chest with the tape level.",
  waist: "Measure around the narrowest part of the torso after a normal exhale.",
  abdomen: "Measure level with the navel after a normal exhale.",
  hips: "Measure around the fullest part of the hips with feet together.",
  leftBicep: "Measure the midpoint of each relaxed upper arm.",
  leftForearm: "Measure around the fullest part of each relaxed forearm.",
  leftThigh: "Measure around the fullest part of each upper thigh.",
  leftCalf: "Measure around the fullest part of each calf.",
};

export const MODE_FIELDS: Record<EntryMode, SessionField[]> = {
  NEWBIE: ["neck", "chest", "waist", "abdomen", "hips", "leftBicep", "rightBicep", "leftForearm", "rightForearm", "leftThigh", "rightThigh", "leftCalf", "rightCalf"],
  NORMAL: ["neck", "chest", "waist", "abdomen", "hips", "leftBicep", "rightBicep", "leftThigh", "rightThigh"],
  PRO: ["neck", "chest", "waist", "abdomen", "hips", "leftBicep", "rightBicep", "leftForearm", "rightForearm", "leftThigh", "rightThigh", "leftCalf", "rightCalf"],
};

export const NOVICE_STEPS: WizardStep[] = [
  { title: "Neck", description: GUIDANCE.neck ?? "", fields: ["neck"] },
  { title: "Chest", description: GUIDANCE.chest ?? "", fields: ["chest"] },
  { title: "Waist", description: GUIDANCE.waist ?? "", fields: ["waist"] },
  { title: "Abdomen", description: GUIDANCE.abdomen ?? "", fields: ["abdomen"] },
  { title: "Hips", description: GUIDANCE.hips ?? "", fields: ["hips"] },
  { title: "Upper arms", description: GUIDANCE.leftBicep ?? "", fields: ["leftBicep", "rightBicep"] },
  { title: "Forearms", description: GUIDANCE.leftForearm ?? "", fields: ["leftForearm", "rightForearm"] },
  { title: "Thighs", description: GUIDANCE.leftThigh ?? "", fields: ["leftThigh", "rightThigh"] },
  { title: "Calves", description: GUIDANCE.leftCalf ?? "", fields: ["leftCalf", "rightCalf"] },
];

export const CORE_MEASUREMENT_FIELDS: Array<{ field: SessionField; stepIndex: number }> = [
  { field: "neck", stepIndex: 0 }, { field: "chest", stepIndex: 1 }, { field: "waist", stepIndex: 2 },
  { field: "abdomen", stepIndex: 3 }, { field: "hips", stepIndex: 4 },
];

export const PAIRED_MEASUREMENT_FIELDS: Array<{ title: string; left: SessionField; right: SessionField; stepIndex: number }> = [
  { title: "Upper arms", left: "leftBicep", right: "rightBicep", stepIndex: 5 },
  { title: "Forearms", left: "leftForearm", right: "rightForearm", stepIndex: 6 },
  { title: "Thighs", left: "leftThigh", right: "rightThigh", stepIndex: 7 },
  { title: "Calves", left: "leftCalf", right: "rightCalf", stepIndex: 8 },
];

export function createEmptySessionValues(): Record<SessionField, string> {
  return Object.fromEntries(Object.keys(FIELD_LABELS).map((key) => [key, ""])) as Record<SessionField, string>;
}

export function getLocalDateTimeValue(date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function optionalNumber(value: string): number | undefined {
  return value.trim() === "" ? undefined : Number(value);
}

export function formatMeasurementValue(value: number | null | undefined, unit = ""): string {
  if (value == null) return "—";
  return `${formatMeasurement(value, unit as WeightUnit | LengthUnit | "%")} ${unit}`.trim();
}

export function calculationMethodLabel(method: string | null): string {
  if (!method) return "Not calculated";
  if (method === "US_NAVY_CIRCUMFERENCE") return "U.S. Navy circumference estimate";
  if (method === "WAIST_CM_DIVIDED_BY_HEIGHT_CM") return "Waist divided by height";
  if (method === "USER_PROVIDED") return "User provided";
  return method.replaceAll("_", " ").toLowerCase();
}
