import { useLocale } from "../../i18n/LocaleContext";
import type {
  MeasurementComparisonValue,
  MeasurementSessionComparison,
} from "../../services/measurementService";
import {
  calculationMethodLabel,
  FIELD_LABELS,
  PAIRED_MEASUREMENT_FIELDS,
} from "./measurementSessionModel";

interface MeasurementComparisonTableProps {
  comparison: MeasurementSessionComparison;
}

type DisplayColumn = "baseline" | "comparison" | "absolute" | "percentage";
type PairedField = MeasurementSessionComparison["pairedMeasurements"][number]["field"];
type CalculatedField = MeasurementSessionComparison["calculatedMetrics"][number]["field"];

const PAIRED_LEFT_FIELDS: Record<PairedField, typeof PAIRED_MEASUREMENT_FIELDS[number]["left"]> = {
  upperArms: "leftBicep",
  forearms: "leftForearm",
  thighs: "leftThigh",
  calves: "leftCalf",
};
const CALCULATED_LABELS: Record<CalculatedField, string> = {
  bodyFat: "Body fat",
  waistToHeightRatio: "Waist-to-height",
  fatMass: "Fat mass",
  leanMass: "Lean mass",
};

function statusMessage(status: MeasurementComparisonValue["status"]): string | null {
  if (status === "MISSING_BOTH") return "Neither session recorded this measurement";
  if (status === "MISSING_BASELINE") return "Baseline not recorded";
  if (status === "MISSING_COMPARISON") return "Comparison not recorded";
  return null;
}

export default function MeasurementComparisonTable({ comparison }: MeasurementComparisonTableProps) {
  const { locale, t } = useLocale();

  const formatNumber = (value: number, unit: MeasurementComparisonValue["displayUnit"], signed = false): string => {
    const maximumFractionDigits = unit === "ratio" ? 4 : 2;
    const formatted = new Intl.NumberFormat(locale, {
      maximumFractionDigits,
      minimumFractionDigits: unit === "ratio" ? 3 : 0,
      signDisplay: signed ? "exceptZero" : "auto",
    }).format(value);
    if (unit === "ratio") return formatted;
    return `${formatted} ${unit === "percent" ? "%" : unit}`;
  };

  const renderValue = (result: MeasurementComparisonValue, column: DisplayColumn) => {
    if (column === "baseline") {
      return result.baselineValue == null
        ? <span className="measurement-not-recorded">{t("Not recorded")}</span>
        : formatNumber(result.baselineValue, result.displayUnit);
    }
    if (column === "comparison") {
      return result.comparisonValue == null
        ? <span className="measurement-not-recorded">{t("Not recorded")}</span>
        : formatNumber(result.comparisonValue, result.displayUnit);
    }
    const unavailable = statusMessage(result.status);
    if (unavailable) return <span className="measurement-comparison-unavailable">{t(unavailable)}</span>;
    if (column === "absolute") {
      return result.absoluteChange == null
        ? <span className="measurement-comparison-unavailable">{t("Not available")}</span>
        : formatNumber(result.absoluteChange, result.displayUnit, true);
    }
    if (result.status === "ZERO_BASELINE") {
      return <span className="measurement-comparison-unavailable">{t("Unavailable because baseline is zero")}</span>;
    }
    return result.percentageChange == null
      ? <span className="measurement-comparison-unavailable">{t("Not available")}</span>
      : formatNumber(result.percentageChange, "percent", true);
  };

  const renderPairCell = (
    item: MeasurementSessionComparison["pairedMeasurements"][number],
    column: DisplayColumn
  ) => <span className="measurement-comparison-pair">
    <span><b>{t("Left")}:</b> {renderValue(item.left, column)}</span>
    <span><b>{t("Right")}:</b> {renderValue(item.right, column)}</span>
  </span>;

  const pairLabel = (field: PairedField): string => {
    const leftField = PAIRED_LEFT_FIELDS[field];
    return PAIRED_MEASUREMENT_FIELDS.find((pair) => pair.left === leftField)?.title ?? field;
  };

  return <div className="measurement-table-wrap">
    <table className="measurement-table measurement-comparison-table">
      <caption className="sr-only">{t("Body measurement changes between the selected baseline and comparison sessions.")}</caption>
      <thead><tr><th>{t("Measurement")}</th><th>{t("Baseline")}</th><th>{t("Comparison")}</th><th>{t("Absolute change")}</th><th>{t("Percentage change")}</th></tr></thead>
      <tbody>
        {comparison.coreMeasurements.map((item) => <tr key={item.field}>
          <th scope="row">{t(FIELD_LABELS[item.field])}</th>
          <td>{renderValue(item.value, "baseline")}</td>
          <td>{renderValue(item.value, "comparison")}</td>
          <td>{renderValue(item.value, "absolute")}</td>
          <td>{renderValue(item.value, "percentage")}</td>
        </tr>)}
        {comparison.pairedMeasurements.map((item) => <tr key={item.field}>
          <th scope="row">{t(pairLabel(item.field))}</th>
          <td>{renderPairCell(item, "baseline")}</td>
          <td>{renderPairCell(item, "comparison")}</td>
          <td>{renderPairCell(item, "absolute")}</td>
          <td>{renderPairCell(item, "percentage")}</td>
        </tr>)}
        <tr className="measurement-comparison-section-row"><th scope="rowgroup" colSpan={5}>{t("Calculated metrics")}</th></tr>
        {comparison.calculatedMetrics.map((item) => <tr key={item.field} className="measurement-comparison-calculated-row">
          <th scope="row">{t(CALCULATED_LABELS[item.field])}</th>
          <td>
            {renderValue(item.value, "baseline")}
            {item.baselineMethod && <small className="measurement-comparison-method">{t(calculationMethodLabel(item.baselineMethod))}</small>}
          </td>
          <td>
            {renderValue(item.value, "comparison")}
            {item.comparisonMethod && <small className="measurement-comparison-method">{t(calculationMethodLabel(item.comparisonMethod))}</small>}
          </td>
          <td>{renderValue(item.value, "absolute")}</td>
          <td>{renderValue(item.value, "percentage")}</td>
        </tr>)}
      </tbody>
    </table>
  </div>;
}
