import { useEffect, useRef } from "react";
import { useLocale } from "../../i18n/LocaleContext";
import type { Measurement, MeasurementDisplayUnits } from "../../services/measurementService";
import MeasurementDetailsTable from "./MeasurementDetailsTable";
import { calculationMethodLabel, formatMeasurementValue } from "./measurementSessionModel";

interface MeasurementSessionDetailModalProps {
  measurement: Measurement;
  fallbackUnits: MeasurementDisplayUnits;
  onClose: () => void;
}

export default function MeasurementSessionDetailModal({ measurement, fallbackUnits, onClose }: MeasurementSessionDetailModalProps) {
  const { locale, t } = useLocale();
  const modalRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const units = measurement.displayUnits ?? fallbackUnits;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    headingRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      const modal = modalRef.current;
      if (event.key !== "Tab" || !modal) return;
      const focusable = Array.from(modal.querySelectorAll<HTMLElement>("button:not([disabled]), [tabindex]:not([tabindex='-1'])"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;
      if (event.shiftKey && (activeElement === first || !focusable.includes(activeElement as HTMLElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const unavailable = <span className="measurement-not-recorded">{t("Not recorded")}</span>;

  return <div className="measurement-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={modalRef} tabIndex={-1} className="measurement-modal measurement-detail-modal" role="dialog" aria-modal="true" aria-labelledby="measurement-detail-title" aria-describedby="measurement-detail-description">
      <header className="measurement-modal-header">
        <div>
          <span className="measurement-eyebrow">{t("History")}</span>
          <h2 id="measurement-detail-title" ref={headingRef} tabIndex={-1}>{t("Measurement session details")}</h2>
          <p id="measurement-detail-description">{t("Observed")} {new Date(measurement.measurementDate).toLocaleString(locale)}</p>
        </div>
        <button type="button" className="measurement-modal-close" onClick={onClose} aria-label={t("Close session details")}>×</button>
      </header>
      <div className="measurement-modal-body">
        <section className="measurement-detail-section" aria-labelledby="recorded-measurements-heading">
          <h3 id="recorded-measurements-heading">{t("Recorded measurements")}</h3>
          <MeasurementDetailsTable measurement={measurement} lengthUnit={units.length} />
        </section>
        <section className="measurement-detail-section" aria-labelledby="calculated-results-heading">
          <h3 id="calculated-results-heading">{t("Calculated results")}</h3>
          <dl className="measurement-detail-calculations">
            <div>
              <dt>{t("Body fat estimate")}</dt>
              <dd>{measurement.bodyFat == null ? unavailable : formatMeasurementValue(measurement.bodyFat, "%")}</dd>
              {measurement.bodyFat != null && <small>{t("Calculation method")}: {t(calculationMethodLabel(measurement.bodyFatMethod))}</small>}
            </div>
            <div>
              <dt>{t("Waist-to-height")}</dt>
              <dd>{measurement.waistToHeightRatio == null ? unavailable : measurement.waistToHeightRatio.toFixed(3)}</dd>
              {measurement.waistToHeightRatio != null && <small>{t("Calculation method")}: {t(calculationMethodLabel(measurement.waistToHeightRatioMethod))}</small>}
            </div>
            <div><dt>{t("Fat mass")}</dt><dd>{measurement.fatMass == null ? unavailable : formatMeasurementValue(measurement.fatMass, units.weight)}</dd></div>
            <div><dt>{t("Lean mass")}</dt><dd>{measurement.leanMass == null ? unavailable : formatMeasurementValue(measurement.leanMass, units.weight)}</dd></div>
          </dl>
        </section>
      </div>
      <footer className="measurement-modal-footer">
        <button type="button" onClick={onClose}>{t("Close")}</button>
      </footer>
    </section>
  </div>;
}
