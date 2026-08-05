import { useLocale } from "../i18n/LocaleContext";
import type { PreferredTimeFormat } from "../services/profileService";

interface LocalizedTimeInputProps {
  value: string;
  timeFormat: PreferredTimeFormat;
  required?: boolean;
  onChange: (value: string) => void;
}

function parseTime(value: string): { hour: number; minute: number } {
  const [hourValue, minuteValue] = value.split(":").map(Number);
  return {
    hour: Number.isInteger(hourValue) && hourValue >= 0 && hourValue <= 23 ? hourValue : 0,
    minute: Number.isInteger(minuteValue) && minuteValue >= 0 && minuteValue <= 59 ? minuteValue : 0,
  };
}

function formatValue(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export default function LocalizedTimeInput({
  value,
  timeFormat,
  required = false,
  onChange,
}: LocalizedTimeInputProps) {
  const { t } = useLocale();
  const { hour, minute } = parseTime(value);
  const is24Hour = timeFormat === "24";
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = is24Hour ? hour : hour % 12 || 12;

  const updateHour = (nextDisplayHour: number) => {
    if (is24Hour) {
      onChange(formatValue(nextDisplayHour, minute));
      return;
    }
    const nextHour = nextDisplayHour % 12 + (period === "PM" ? 12 : 0);
    onChange(formatValue(nextHour, minute));
  };

  const updatePeriod = (nextPeriod: "AM" | "PM") => {
    const baseHour = hour % 12;
    onChange(formatValue(baseHour + (nextPeriod === "PM" ? 12 : 0), minute));
  };

  return (
    <div className={`localized-time-input localized-time-input-${is24Hour ? "24" : "12"}`}>
      <select
        required={required}
        value={displayHour}
        aria-label={t("Hour")}
        onChange={(event) => updateHour(Number(event.target.value))}
      >
        {Array.from({ length: is24Hour ? 24 : 12 }, (_, index) => {
          const optionHour = is24Hour ? index : index + 1;
          return <option key={optionHour} value={optionHour}>{String(optionHour).padStart(is24Hour ? 2 : 1, "0")}</option>;
        })}
      </select>
      <span aria-hidden="true">:</span>
      <select
        required={required}
        value={minute}
        aria-label={t("Minute")}
        onChange={(event) => onChange(formatValue(hour, Number(event.target.value)))}
      >
        {Array.from({ length: 60 }, (_, optionMinute) => (
          <option key={optionMinute} value={optionMinute}>{String(optionMinute).padStart(2, "0")}</option>
        ))}
      </select>
      {!is24Hour && (
        <select
          required={required}
          value={period}
          aria-label={t("Time period")}
          onChange={(event) => updatePeriod(event.target.value as "AM" | "PM")}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      )}
    </div>
  );
}
