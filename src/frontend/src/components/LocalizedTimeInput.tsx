import type { PreferredTimeFormat } from "../services/profileService";

interface LocalizedTimeInputProps {
  value: string;
  timeFormat: PreferredTimeFormat;
  required?: boolean;
  onChange: (value: string) => void;
}

export default function LocalizedTimeInput({
  value,
  timeFormat,
  required = false,
  onChange,
}: LocalizedTimeInputProps) {
  return (
    <input
      type="time"
      required={required}
      value={value}
      step={60}
      lang={timeFormat === "24" ? "en-GB" : "en-US"}
      data-time-format={timeFormat}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
