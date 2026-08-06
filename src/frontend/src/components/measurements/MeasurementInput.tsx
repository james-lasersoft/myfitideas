import type { KeyboardEvent as ReactKeyboardEvent, Ref } from "react";
import { useLocale } from "../../i18n/LocaleContext";
import type { LengthUnit } from "../../services/measurementService";
import { getMeasurementStep } from "../../utils/measurementFormat";
import { FIELD_LABELS, type SessionField } from "./measurementSessionModel";

interface MeasurementInputProps {
  field: SessionField;
  lengthUnit: LengthUnit;
  value: string;
  inputRef: Ref<HTMLInputElement>;
  onChange: (value: string) => void;
  onKeyDown?: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
}

export default function MeasurementInput({ field, lengthUnit, value, inputRef, onChange, onKeyDown }: MeasurementInputProps) {
  const { t } = useLocale();
  return <label className="measurement-input">
    <span>{t(FIELD_LABELS[field])} <em>{lengthUnit}</em></span>
    <input ref={inputRef} type="number" min="0" step={getMeasurementStep(lengthUnit)} value={value}
      onChange={(event) => onChange(event.target.value)} onKeyDown={onKeyDown} inputMode="decimal" />
  </label>;
}
