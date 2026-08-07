import abdomenIllustration from "../../assets/measurements/abdomen.svg";
import calfIllustration from "../../assets/measurements/calf.svg";
import chestIllustration from "../../assets/measurements/chest.svg";
import forearmIllustration from "../../assets/measurements/forearm.svg";
import hipsIllustration from "../../assets/measurements/hips.svg";
import neckIllustration from "../../assets/measurements/neck.svg";
import thighIllustration from "../../assets/measurements/thigh.svg";
import upperArmIllustration from "../../assets/measurements/upper-arm.svg";
import waistIllustration from "../../assets/measurements/waist.svg";
import type { CreateMeasurementInput, LengthUnit, WeightUnit } from "../../services/measurementService";
import { formatMeasurement } from "../../utils/measurementFormat";

export type EntryMode = "NEWBIE" | "NORMAL" | "PRO";
export type SessionField = Exclude<keyof CreateMeasurementInput, "weight" | "weightUnit" | "lengthUnit" | "measurementDate" | "confirmAnomaly" | "bodyFat">;
export type MeasurementSide = "left" | "right";

export interface MeasurementIllustrationMetadata {
  asset: string;
  altTextSource: string;
  shortInstructionSource: string;
  extendedInstructionSource?: string;
  sideAssets?: Partial<Record<MeasurementSide, string>>;
}

export interface MeasurementDefinition {
  label: string;
  illustration: MeasurementIllustrationMetadata;
}

export interface WizardStep {
  title: string;
  description: string;
  fields: SessionField[];
  illustration: MeasurementIllustrationMetadata;
}

const neckMetadata: MeasurementIllustrationMetadata = {
  asset: neckIllustration,
  altTextSource: "Illustration showing tape placement around the neck.",
  shortInstructionSource: "Place the tape below the larynx, level and snug without compressing the skin.",
};
const chestMetadata: MeasurementIllustrationMetadata = {
  asset: chestIllustration,
  altTextSource: "Illustration showing tape placement around the chest.",
  shortInstructionSource: "Measure around the fullest part of the chest with the tape level.",
};
const waistMetadata: MeasurementIllustrationMetadata = {
  asset: waistIllustration,
  altTextSource: "Illustration showing tape placement around the waist.",
  shortInstructionSource: "Measure around the narrowest part of the torso after a normal exhale.",
};
const abdomenMetadata: MeasurementIllustrationMetadata = {
  asset: abdomenIllustration,
  altTextSource: "Illustration showing tape placement around the abdomen.",
  shortInstructionSource: "Measure level with the navel after a normal exhale.",
};
const hipsMetadata: MeasurementIllustrationMetadata = {
  asset: hipsIllustration,
  altTextSource: "Illustration showing tape placement around the hips.",
  shortInstructionSource: "Measure around the fullest part of the hips with feet together.",
};
const upperArmMetadata: MeasurementIllustrationMetadata = {
  asset: upperArmIllustration,
  altTextSource: "Illustration showing tape placement around the upper arm.",
  shortInstructionSource: "Measure the midpoint of each relaxed upper arm.",
};
const forearmMetadata: MeasurementIllustrationMetadata = {
  asset: forearmIllustration,
  altTextSource: "Illustration showing tape placement around the forearm.",
  shortInstructionSource: "Measure around the fullest part of each relaxed forearm.",
};
const thighMetadata: MeasurementIllustrationMetadata = {
  asset: thighIllustration,
  altTextSource: "Illustration showing tape placement around the thigh.",
  shortInstructionSource: "Measure around the fullest part of each upper thigh.",
};
const calfMetadata: MeasurementIllustrationMetadata = {
  asset: calfIllustration,
  altTextSource: "Illustration showing tape placement around the calf.",
  shortInstructionSource: "Measure around the fullest part of each calf.",
};

export const MEASUREMENT_DEFINITIONS: Record<SessionField, MeasurementDefinition> = {
  waist: { label: "Waist", illustration: waistMetadata },
  chest: { label: "Chest", illustration: chestMetadata },
  hips: { label: "Hips", illustration: hipsMetadata },
  neck: { label: "Neck", illustration: neckMetadata },
  abdomen: { label: "Abdomen", illustration: abdomenMetadata },
  leftBicep: { label: "Left upper arm", illustration: upperArmMetadata },
  rightBicep: { label: "Right upper arm", illustration: upperArmMetadata },
  leftForearm: { label: "Left forearm", illustration: forearmMetadata },
  rightForearm: { label: "Right forearm", illustration: forearmMetadata },
  leftThigh: { label: "Left thigh", illustration: thighMetadata },
  rightThigh: { label: "Right thigh", illustration: thighMetadata },
  leftCalf: { label: "Left calf", illustration: calfMetadata },
  rightCalf: { label: "Right calf", illustration: calfMetadata },
};

export const FIELD_LABELS: Record<SessionField, string> = Object.fromEntries(
  Object.entries(MEASUREMENT_DEFINITIONS).map(([field, definition]) => [field, definition.label])
) as Record<SessionField, string>;

export function getMeasurementIllustrationAsset(
  illustration: MeasurementIllustrationMetadata,
  side?: MeasurementSide,
): string {
  return (side ? illustration.sideAssets?.[side] : undefined) ?? illustration.asset;
}

export const MODE_FIELDS: Record<EntryMode, SessionField[]> = {
  NEWBIE: ["neck", "chest", "waist", "abdomen", "hips", "leftBicep", "rightBicep", "leftForearm", "rightForearm", "leftThigh", "rightThigh", "leftCalf", "rightCalf"],
  NORMAL: ["neck", "chest", "waist", "abdomen", "hips", "leftBicep", "rightBicep", "leftThigh", "rightThigh"],
  PRO: ["neck", "chest", "waist", "abdomen", "hips", "leftBicep", "rightBicep", "leftForearm", "rightForearm", "leftThigh", "rightThigh", "leftCalf", "rightCalf"],
};

export const NOVICE_STEPS: WizardStep[] = [
  { title: "Neck", description: neckMetadata.shortInstructionSource, fields: ["neck"], illustration: neckMetadata },
  { title: "Chest", description: chestMetadata.shortInstructionSource, fields: ["chest"], illustration: chestMetadata },
  { title: "Waist", description: waistMetadata.shortInstructionSource, fields: ["waist"], illustration: waistMetadata },
  { title: "Abdomen", description: abdomenMetadata.shortInstructionSource, fields: ["abdomen"], illustration: abdomenMetadata },
  { title: "Hips", description: hipsMetadata.shortInstructionSource, fields: ["hips"], illustration: hipsMetadata },
  { title: "Upper arms", description: upperArmMetadata.shortInstructionSource, fields: ["leftBicep", "rightBicep"], illustration: upperArmMetadata },
  { title: "Forearms", description: forearmMetadata.shortInstructionSource, fields: ["leftForearm", "rightForearm"], illustration: forearmMetadata },
  { title: "Thighs", description: thighMetadata.shortInstructionSource, fields: ["leftThigh", "rightThigh"], illustration: thighMetadata },
  { title: "Calves", description: calfMetadata.shortInstructionSource, fields: ["leftCalf", "rightCalf"], illustration: calfMetadata },
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
