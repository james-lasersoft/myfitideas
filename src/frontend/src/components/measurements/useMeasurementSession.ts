import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useLocale } from "../../i18n/LocaleContext";
import type { CreateMeasurementInput, LengthUnit } from "../../services/measurementService";
import {
  createEmptySessionValues,
  FIELD_LABELS,
  getLocalDateTimeValue,
  MODE_FIELDS,
  NOVICE_STEPS,
  optionalNumber,
  type EntryMode,
  type SessionField,
} from "./measurementSessionModel";

interface UseMeasurementSessionOptions {
  isOpen: boolean;
  entryMode: EntryMode;
  lengthUnit: LengthUnit;
  onSave: (input: CreateMeasurementInput) => Promise<void>;
}

export function useMeasurementSession({ isOpen, entryMode, lengthUnit, onSave }: UseMeasurementSessionOptions) {
  const { t } = useLocale();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const inputRefs = useRef<Partial<Record<SessionField, HTMLInputElement | null>>>({});
  const reviewReadyRef = useRef(false);
  const wasOpenRef = useRef(false);
  const [noviceStep, setNoviceStep] = useState(0);
  const [measurementDate, setMeasurementDate] = useState(getLocalDateTimeValue());
  const [values, setValues] = useState<Record<SessionField, string>>(createEmptySessionValues);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const reset = useCallback((): void => {
    reviewReadyRef.current = false;
    setValues(createEmptySessionValues());
    setMeasurementDate(getLocalDateTimeValue());
    setNoviceStep(0);
    setError("");
  }, []);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) reset();
    wasOpenRef.current = isOpen;
  }, [isOpen, reset]);

  const isNoviceReview = noviceStep === NOVICE_STEPS.length;
  const currentNoviceStep = NOVICE_STEPS[Math.min(noviceStep, NOVICE_STEPS.length - 1)];

  useEffect(() => {
    if (!isOpen || entryMode !== "NEWBIE") return;
    if (isNoviceReview) {
      headingRef.current?.focus();
      return;
    }
    const firstField = currentNoviceStep.fields[0];
    requestAnimationFrame(() => {
      if (firstField) inputRefs.current[firstField]?.focus();
    });
  }, [currentNoviceStep, entryMode, isNoviceReview, isOpen, noviceStep]);

  const setField = (field: SessionField, value: string): void => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const validateNoviceFields = (fields: SessionField[]): boolean => {
    const invalidField = fields.find((field) => {
      const value = optionalNumber(values[field]);
      return value !== undefined && (!Number.isFinite(value) || value <= 0);
    });
    if (!invalidField) return true;
    setError(`${t(FIELD_LABELS[invalidField])} ${t("must be a positive number or left blank.")}`);
    requestAnimationFrame(() => inputRefs.current[invalidField]?.focus());
    return false;
  };

  const showNoviceReview = (): void => {
    reviewReadyRef.current = false;
    setNoviceStep(NOVICE_STEPS.length);
    requestAnimationFrame(() => requestAnimationFrame(() => { reviewReadyRef.current = true; }));
  };

  const advanceNovice = (): void => {
    setError("");
    if (isNoviceReview || !validateNoviceFields(currentNoviceStep.fields)) return;
    if (noviceStep === NOVICE_STEPS.length - 1) {
      showNoviceReview();
      return;
    }
    setNoviceStep((step) => Math.min(step + 1, NOVICE_STEPS.length));
  };

  const editNoviceStep = (stepIndex: number): void => {
    reviewReadyRef.current = false;
    setError("");
    setNoviceStep(stepIndex);
  };

  const skipNoviceStep = (): void => {
    currentNoviceStep.fields.forEach((field) => setField(field, ""));
    if (noviceStep === NOVICE_STEPS.length - 1) {
      setError("");
      showNoviceReview();
      return;
    }
    setError("");
    setNoviceStep((step) => Math.min(step + 1, NOVICE_STEPS.length));
  };

  const handleNoviceInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>, field: SessionField): void => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    const fieldIndex = currentNoviceStep.fields.indexOf(field);
    if (fieldIndex < 0) return;
    const nextField = currentNoviceStep.fields[fieldIndex + 1];
    if (nextField) {
      if (!validateNoviceFields([field])) return;
      inputRefs.current[nextField]?.focus();
      return;
    }
    advanceNovice();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (entryMode === "NEWBIE" && !isNoviceReview) {
      advanceNovice();
      return;
    }
    if (entryMode === "NEWBIE" && !reviewReadyRef.current) {
      reviewReadyRef.current = true;
      return;
    }

    setError("");
    const observedAt = new Date(measurementDate);
    if (Number.isNaN(observedAt.getTime())) {
      setError("Enter a valid session observation date and time.");
      return;
    }
    const visibleFields = MODE_FIELDS[entryMode];
    const input = visibleFields.reduce<CreateMeasurementInput>((result, field) => {
      const value = optionalNumber(values[field]);
      if (value !== undefined) result[field] = value;
      return result;
    }, { lengthUnit, measurementDate: observedAt.toISOString() });
    const supplied = visibleFields.filter((field) => input[field] !== undefined);
    if (supplied.length === 0) {
      setError("Enter at least one body measurement.");
      return;
    }
    if (supplied.some((field) => !Number.isFinite(input[field]) || Number(input[field]) <= 0)) {
      setError("Measurement values must be positive numbers.");
      return;
    }

    setIsSaving(true);
    try {
      await onSave(input);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save measurement.");
    } finally {
      setIsSaving(false);
    }
  };

  const goBack = (): void => {
    reviewReadyRef.current = false;
    setNoviceStep((step) => Math.max(0, step - 1));
  };

  return {
    entryMode,
    noviceStep,
    measurementDate,
    values,
    error,
    isSaving,
    isNoviceReview,
    currentNoviceStep,
    headingRef,
    inputRefs,
    setMeasurementDate,
    setField,
    advanceNovice,
    editNoviceStep,
    skipNoviceStep,
    handleNoviceInputKeyDown,
    handleSubmit,
    goBack,
    reset,
  };
}
