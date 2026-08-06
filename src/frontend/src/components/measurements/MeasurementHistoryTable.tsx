import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useLocale } from "../../i18n/LocaleContext";
import type { Measurement, MeasurementDisplayUnits } from "../../services/measurementService";
import { calculationMethodLabel, formatMeasurementValue } from "./measurementSessionModel";

interface MeasurementHistoryTableProps {
  measurements: Measurement[];
  fallbackUnits: MeasurementDisplayUnits;
  onSelect: (measurement: Measurement, trigger: HTMLTableRowElement) => void;
}

export default function MeasurementHistoryTable({ measurements, fallbackUnits, onSelect }: MeasurementHistoryTableProps) {
  const { locale, t } = useLocale();

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLTableRowElement>, measurement: Measurement): void => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect(measurement, event.currentTarget);
  };

  return <div className="measurement-table-wrap">
    <table className="measurement-table">
      <caption className="sr-only">{t("Body measurement sessions. Activate a row to view full session details.")}</caption>
      <thead><tr><th>{t("Observed at")}</th><th>{t("Waist")}</th><th>{t("Body fat")}</th><th>{t("Waist / height")}</th><th>{t("Lean mass")}</th><th>{t("Method")}</th></tr></thead>
      <tbody>{measurements.map((measurement) => {
        const units = measurement.displayUnits ?? fallbackUnits;
        const observedAt = new Date(measurement.measurementDate).toLocaleString(locale);
        return <tr
          key={measurement.id}
          className="measurement-history-row"
          tabIndex={0}
          onClick={(event) => onSelect(measurement, event.currentTarget)}
          onKeyDown={(event) => handleKeyDown(event, measurement)}
          aria-label={`${t("Open session details")}: ${observedAt}`}
        >
          <td><strong>{observedAt}</strong></td>
          <td>{formatMeasurementValue(measurement.waist, units.length)}</td>
          <td>{formatMeasurementValue(measurement.bodyFat, "%")}</td>
          <td>{measurement.waistToHeightRatio?.toFixed(3) ?? "—"}</td>
          <td>{formatMeasurementValue(measurement.leanMass, units.weight)}</td>
          <td><span className="measurement-method-chip" title={`${t("Body fat")}: ${t(calculationMethodLabel(measurement.bodyFatMethod))}. ${t("Waist-to-height")}: ${t(calculationMethodLabel(measurement.waistToHeightRatioMethod))}.`}>{t(measurement.bodyFatMethod ? "Calculated" : measurement.waistToHeightRatioMethod ? "Ratio only" : "Recorded")}</span></td>
        </tr>;
      })}</tbody>
    </table>
  </div>;
}
