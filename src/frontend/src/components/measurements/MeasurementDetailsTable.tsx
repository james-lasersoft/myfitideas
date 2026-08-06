import { useLocale } from "../../i18n/LocaleContext";
import type { LengthUnit, Measurement } from "../../services/measurementService";
import {
  CORE_MEASUREMENT_FIELDS,
  FIELD_LABELS,
  formatMeasurementValue,
  PAIRED_MEASUREMENT_FIELDS,
  type SessionField,
} from "./measurementSessionModel";

interface MeasurementDetailsTableProps {
  measurement: Measurement;
  lengthUnit: LengthUnit;
}

export default function MeasurementDetailsTable({ measurement, lengthUnit }: MeasurementDetailsTableProps) {
  const { t } = useLocale();

  const displayValue = (field: SessionField) => {
    const value = measurement[field];
    return value == null
      ? <span className="measurement-not-recorded">{t("Not recorded")}</span>
      : formatMeasurementValue(value, lengthUnit);
  };

  return <div className="measurement-table-wrap">
    <table className="measurement-table measurement-detail-table">
      <caption className="sr-only">{t("All recorded and unrecorded body measurements for this session.")}</caption>
      <thead><tr><th>{t("Measurement")}</th><th>{t("Recorded value")}</th></tr></thead>
      <tbody>
        {CORE_MEASUREMENT_FIELDS.map(({ field }) => <tr key={field}>
          <th scope="row">{t(FIELD_LABELS[field])}</th>
          <td>{displayValue(field)}</td>
        </tr>)}
        {PAIRED_MEASUREMENT_FIELDS.map(({ title, left, right }) => <tr key={title}>
          <th scope="row">{t(title)}</th>
          <td><span className="measurement-detail-pair"><span><b>{t("Left")}:</b> {displayValue(left)}</span><span><b>{t("Right")}:</b> {displayValue(right)}</span></span></td>
        </tr>)}
      </tbody>
    </table>
  </div>;
}
