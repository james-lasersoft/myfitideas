import { useCallback, useEffect, useRef } from "react";
import { useLocale } from "../../i18n/LocaleContext";
import type { CreateMeasurementInput, LengthUnit } from "../../services/measurementService";
import MeasurementInput from "./MeasurementInput";
import NoviceMeasurementWizard from "./NoviceMeasurementWizard";
import { getLocalDateTimeValue, MODE_DESCRIPTIONS, MODE_FIELDS, modeLabel, type EntryMode } from "./measurementSessionModel";
import { useMeasurementSession } from "./useMeasurementSession";

interface MeasurementSessionModalProps {
  isOpen: boolean;
  lengthUnit: LengthUnit;
  onCancel: () => void;
  onSave: (input: CreateMeasurementInput) => Promise<void>;
}

export default function MeasurementSessionModal({ isOpen, lengthUnit, onCancel, onSave }: MeasurementSessionModalProps) {
  const { locale, t } = useLocale();
  const modalRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const session = useMeasurementSession({ isOpen, lengthUnit, onSave });

  const cancelSession = useCallback((): void => {
    if (session.isSaving) return;
    session.reset();
    onCancel();
  }, [onCancel, session]);

  useEffect(() => {
    if (!isOpen) return;
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modalRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && !session.isSaving) {
        cancelSession();
        return;
      }
      const modal = modalRef.current;
      if (event.key !== "Tab" || !modal) return;
      const focusable = Array.from(modal.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cancelSession, isOpen, session.isSaving]);

  if (!isOpen) return null;

  return <div className="measurement-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) cancelSession(); }}>
    <section ref={modalRef} tabIndex={-1} className="measurement-modal" role="dialog" aria-modal="true" aria-labelledby="measurement-modal-title" aria-describedby="measurement-modal-description">
      <header className="measurement-modal-header">
        <div><h2 id="measurement-modal-title">{t("Body measurement session")}</h2><p id="measurement-modal-description">{t("Observed")} {new Date(session.measurementDate).toLocaleString(locale)}</p></div>
        <button type="button" className="measurement-modal-close" onClick={cancelSession} disabled={session.isSaving} aria-label={t("Close measurement session")}>×</button>
      </header>
      <div className="measurement-modal-body">
        {session.error && <div className="measurement-banner measurement-banner-error" role="alert">{t(session.error)}</div>}
        <div className="measurement-modal-controls">
          <div><strong>{t("Entry mode")}</strong><span>{t(MODE_DESCRIPTIONS[session.entryMode])}</span></div>
          <div className="measurement-mode-selector measurement-mode-segmented" role="group" aria-label={t("Measurement guidance level")}>
            {(["NEWBIE", "NORMAL", "PRO"] as EntryMode[]).map((mode) => <button key={mode} type="button" className={session.entryMode === mode ? "active" : ""} onClick={() => session.changeEntryMode(mode)} aria-pressed={session.entryMode === mode}>{t(modeLabel(mode))}</button>)}
          </div>
        </div>
        <details className="measurement-session-help">
          <summary>{t("Keyboard help")}</summary>
          <p>{t("Press Enter to continue. For paired measurements, Enter moves from left to right.")}</p>
        </details>
        <form id="measurement-session-form" className="measurement-wizard" onSubmit={session.handleSubmit}>
          <label className="measurement-date-field"><span>{t("Observed at")}</span><input type="datetime-local" max={getLocalDateTimeValue()} value={session.measurementDate} onChange={(event) => session.setMeasurementDate(event.target.value)} required /></label>
          {session.entryMode === "NEWBIE" ? <NoviceMeasurementWizard
            step={session.noviceStep}
            currentStep={session.currentNoviceStep}
            isReview={session.isNoviceReview}
            values={session.values}
            lengthUnit={lengthUnit}
            headingRef={session.headingRef}
            inputRefs={session.inputRefs}
            onFieldChange={session.setField}
            onFieldKeyDown={session.handleNoviceInputKeyDown}
            onEdit={session.editNoviceStep}
          /> : <div className="measurement-input-grid">{MODE_FIELDS[session.entryMode].map((field) => <MeasurementInput
            key={field}
            field={field}
            lengthUnit={lengthUnit}
            value={session.values[field]}
            inputRef={(element) => { session.inputRefs.current[field] = element; }}
            onChange={(value) => session.setField(field, value)}
          />)}</div>}
          <div className="measurement-calculation-note"><strong>{t("Calculated after saving")}</strong><span>{t("Body fat and related metrics are calculated when the required data is available.")}</span></div>
        </form>
      </div>
      <footer className="measurement-modal-footer">
        <button type="button" className="secondary-button" onClick={cancelSession} disabled={session.isSaving}>{t("Cancel")}</button>
        {session.entryMode === "NEWBIE" ? <>
          <button type="button" className="secondary-button" onClick={session.goBack} disabled={session.isSaving || session.noviceStep === 0}>{t("Back")}</button>
          {!session.isNoviceReview && <button type="button" className="secondary-button" onClick={session.skipNoviceStep} disabled={session.isSaving}>{t("Skip")}</button>}
          {session.isNoviceReview ? <button type="submit" form="measurement-session-form" disabled={session.isSaving}>{session.isSaving ? t("Saving...") : t("Save session")}</button> : <button type="button" onClick={session.advanceNovice} disabled={session.isSaving}>{t("Next")}</button>}
        </> : <button type="submit" form="measurement-session-form" disabled={session.isSaving}>{session.isSaving ? t("Saving...") : t("Save session")}</button>}
      </footer>
    </section>
  </div>;
}
