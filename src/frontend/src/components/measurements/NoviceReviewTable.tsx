import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useLocale } from "../../i18n/LocaleContext";
import type { LengthUnit } from "../../services/measurementService";
import { CORE_REVIEW_FIELDS, FIELD_LABELS, PAIRED_REVIEW_FIELDS, type SessionField } from "./measurementSessionModel";

interface NoviceReviewTableProps {
  values: Record<SessionField, string>;
  lengthUnit: LengthUnit;
  onEdit: (stepIndex: number) => void;
}

export default function NoviceReviewTable({ values, lengthUnit, onEdit }: NoviceReviewTableProps) {
  const { t } = useLocale();
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLTableRowElement>, stepIndex: number): void => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onEdit(stepIndex);
  };
  return <div className="measurement-table-wrap">
    <table className="measurement-table novice-review-table">
      <caption className="sr-only">{t("Entered and skipped measurements. Each row opens its matching edit step.")}</caption>
      <thead><tr><th>{t("Measurement")}</th><th>{t("Entered value")}</th><th>{t("Status")}</th></tr></thead>
      <tbody>
        {CORE_REVIEW_FIELDS.map(({ field, stepIndex }) => {
          const entered = values[field].trim() !== "";
          return <tr key={field} tabIndex={0} onDoubleClick={() => onEdit(stepIndex)} onKeyDown={(event) => handleKeyDown(event, stepIndex)} aria-label={`${t("Edit")} ${t(FIELD_LABELS[field])}`}>
            <th scope="row">{t(FIELD_LABELS[field])}</th><td>{entered ? `${values[field]} ${lengthUnit}` : "—"}</td><td>{t(entered ? "Entered" : "Skipped")}</td>
          </tr>;
        })}
        {PAIRED_REVIEW_FIELDS.map(({ title, left, right, stepIndex }) => {
          const leftEntered = values[left].trim() !== "";
          const rightEntered = values[right].trim() !== "";
          const enteredValues = [leftEntered ? `${t("Left")} ${values[left]} ${lengthUnit}` : t("Left skipped"), rightEntered ? `${t("Right")} ${values[right]} ${lengthUnit}` : t("Right skipped")];
          const status = t(leftEntered && rightEntered ? "Entered" : leftEntered || rightEntered ? "Partially entered" : "Skipped");
          return <tr key={title} tabIndex={0} onDoubleClick={() => onEdit(stepIndex)} onKeyDown={(event) => handleKeyDown(event, stepIndex)} aria-label={`${t("Edit")} ${t(title)}`}>
            <th scope="row">{t(title)}</th><td>{enteredValues.join(" · ")}</td><td>{status}</td>
          </tr>;
        })}
      </tbody>
    </table>
  </div>;
}
