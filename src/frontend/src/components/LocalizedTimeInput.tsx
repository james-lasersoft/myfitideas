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
  if (timeFormat === "24") {
    return (
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        required={required}
        value={value}
        placeholder="HH:mm"
        pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
        data-no-translate
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return (
    <input
      type="time"
      required={required}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
