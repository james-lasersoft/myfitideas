import { useLocale } from "../../i18n/LocaleContext";
import type {
  Measurement,
  MeasurementSessionComparison,
} from "../../services/measurementService";
import MeasurementComparisonTable from "./MeasurementComparisonTable";
import { useReadOnlyMeasurementModal } from "./useReadOnlyMeasurementModal";

interface MeasurementComparisonModalProps {
  sessions: Measurement[];
  baselineSessionId: string;
  comparisonSessionId: string;
  comparison: MeasurementSessionComparison | null;
  isLoading: boolean;
  error: string;
  onBaselineChange: (sessionId: string) => void;
  onComparisonChange: (sessionId: string) => void;
  onClose: () => void;
}

export default function MeasurementComparisonModal({
  sessions,
  baselineSessionId,
  comparisonSessionId,
  comparison,
  isLoading,
  error,
  onBaselineChange,
  onComparisonChange,
  onClose,
}: MeasurementComparisonModalProps) {
  const { locale, t } = useLocale();
  const { modalRef, headingRef } = useReadOnlyMeasurementModal(onClose);
  const sortedSessions = sessions.slice().sort(
    (left, right) => new Date(right.measurementDate).getTime() - new Date(left.measurementDate).getTime()
  );
  const baseline = sessions.find((session) => session.id === baselineSessionId);
  const selectedComparison = sessions.find((session) => session.id === comparisonSessionId);

  const renderOptions = (disabledSessionId: string) => sortedSessions.map((session) =>
    <option key={session.id} value={session.id} disabled={session.id === disabledSessionId}>
      {new Date(session.measurementDate).toLocaleString(locale)}
    </option>
  );

  return <div className="measurement-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={modalRef} tabIndex={-1} className="measurement-modal measurement-comparison-modal" role="dialog" aria-modal="true" aria-labelledby="measurement-comparison-title" aria-describedby="measurement-comparison-description">
      <header className="measurement-modal-header">
        <div>
          <span className="measurement-eyebrow">{t("History")}</span>
          <h2 id="measurement-comparison-title" ref={headingRef} tabIndex={-1}>{t("Compare measurement sessions")}</h2>
          <p id="measurement-comparison-description">{t("Choose two different sessions to compare.")}</p>
        </div>
        <button type="button" className="measurement-modal-close" onClick={onClose} aria-label={t("Close comparison")}>×</button>
      </header>
      <div className="measurement-modal-body">
        <div className="measurement-comparison-selectors">
          <label><span>{t("Baseline session")}</span><select aria-label={t("Baseline session")} value={baselineSessionId} onChange={(event) => onBaselineChange(event.target.value)}>{renderOptions(comparisonSessionId)}</select></label>
          <label><span>{t("Comparison session")}</span><select aria-label={t("Comparison session")} value={comparisonSessionId} onChange={(event) => onComparisonChange(event.target.value)}>{renderOptions(baselineSessionId)}</select></label>
        </div>
        {baseline && selectedComparison && <div className="measurement-comparison-dates" aria-live="polite">
          <span><b>{t("Baseline")}:</b> {new Date(baseline.measurementDate).toLocaleString(locale)}</span>
          <span><b>{t("Comparison")}:</b> {new Date(selectedComparison.measurementDate).toLocaleString(locale)}</span>
        </div>}
        <p className="measurement-comparison-note">{t("Values and changes use backend-normalized units.")}</p>
        {isLoading && <p role="status">{t("Loading comparison...")}</p>}
        {error && <p className="measurement-banner measurement-banner-error" role="alert">{t(error)}</p>}
        {!isLoading && !error && comparison && <MeasurementComparisonTable comparison={comparison} />}
      </div>
      <footer className="measurement-modal-footer">
        <button type="button" onClick={onClose}>{t("Close")}</button>
      </footer>
    </section>
  </div>;
}
