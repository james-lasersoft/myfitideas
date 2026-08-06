import type { KeyboardEvent as ReactKeyboardEvent, MutableRefObject, RefObject } from "react";
import { useLocale } from "../../i18n/LocaleContext";
import type { LengthUnit } from "../../services/measurementService";
import MeasurementInput from "./MeasurementInput";
import NoviceReviewTable from "./NoviceReviewTable";
import { NOVICE_STEPS, type SessionField, type WizardStep } from "./measurementSessionModel";

interface NoviceMeasurementWizardProps {
  step: number; currentStep: WizardStep; isReview: boolean; values: Record<SessionField, string>; lengthUnit: LengthUnit;
  headingRef: RefObject<HTMLHeadingElement | null>;
  inputRefs: MutableRefObject<Partial<Record<SessionField, HTMLInputElement | null>>>;
  onFieldChange: (field: SessionField, value: string) => void;
  onFieldKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>, field: SessionField) => void;
  onEdit: (stepIndex: number) => void;
}

export default function NoviceMeasurementWizard({ step, currentStep, isReview, values, lengthUnit, headingRef, inputRefs, onFieldChange, onFieldKeyDown, onEdit }: NoviceMeasurementWizardProps) {
  const { t } = useLocale();
  const totalSteps = NOVICE_STEPS.length + 1;
  return <div className="novice-wizard">
    <div className="novice-progress" aria-label={`${t("Step")} ${Math.min(step + 1, totalSteps)} ${t("of")} ${totalSteps}`}>
      <span>{t("Step")} {Math.min(step + 1, totalSteps)} {t("of")} {totalSteps}</span><progress value={step + 1} max={totalSteps} />
    </div>
    <div className="sr-only" aria-live="polite">{isReview ? t("Review measurements") : `${t(currentStep.title)}. ${t("Step")} ${step + 1} ${t("of")} ${totalSteps}`}</div>
    {isReview ? <section className="novice-review" aria-labelledby="novice-step-heading">
      <h3 id="novice-step-heading" ref={headingRef} tabIndex={-1}>{t("Review your measurements")}</h3>
      <p>{t("Double-click a row, or press Enter or Space, to edit.")}</p>
      <NoviceReviewTable values={values} lengthUnit={lengthUnit} onEdit={onEdit} />
    </section> : <section className="novice-step" aria-labelledby="novice-step-heading">
      <h3 id="novice-step-heading" ref={headingRef} tabIndex={-1}>{t(currentStep.title)}</h3>
      <details className="measurement-technique-help">
        <summary>{t("Technique")}</summary>
        <p>{t(currentStep.description)}</p>
      </details>
      <fieldset><legend className={currentStep.fields.length === 1 ? "sr-only" : undefined}>{currentStep.fields.length === 2 ? `${t(currentStep.title)}: ${t("left and right")}` : t(currentStep.title)}</legend>
        <div className={currentStep.fields.length === 2 ? "measurement-pair-grid" : "measurement-single-grid"}>
          {currentStep.fields.map((field) => <MeasurementInput key={field} field={field} lengthUnit={lengthUnit} value={values[field]}
            inputRef={(element) => { inputRefs.current[field] = element; }} onChange={(value) => onFieldChange(field, value)}
            onKeyDown={(event) => onFieldKeyDown(event, field)} />)}
        </div>
      </fieldset>
    </section>}
  </div>;
}
