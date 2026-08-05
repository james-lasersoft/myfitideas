import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useLocale } from "../i18n/LocaleContext";
import type { PreferredTimeFormat } from "../services/profileService";
import "./LocalizedTimeInput.css";

interface LocalizedTimeInputProps {
  value: string;
  timeFormat: PreferredTimeFormat;
  required?: boolean;
  onChange: (value: string) => void;
}

type PickerStep = "hour" | "minute";
type Period = "AM" | "PM";

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

function displayTime(hour: number, minute: number, is24Hour: boolean): string {
  if (is24Hour) return formatValue(hour, minute);
  const period = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${period}`;
}

function clockPosition(index: number, total: number, radius: number): CSSProperties {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  return {
    left: `calc(50% + ${Math.cos(angle) * radius}px)`,
    top: `calc(50% + ${Math.sin(angle) * radius}px)`,
  };
}

export default function LocalizedTimeInput({
  value,
  timeFormat,
  required = false,
  onChange,
}: LocalizedTimeInputProps) {
  const { t } = useLocale();
  const is24Hour = timeFormat === "24";
  const current = parseTime(value);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<PickerStep>("hour");
  const [draftHour, setDraftHour] = useState(current.hour);
  const [draftMinute, setDraftMinute] = useState(current.minute);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const period: Period = draftHour >= 12 ? "PM" : "AM";
  const displayHour = is24Hour ? draftHour : draftHour % 12 || 12;

  const hourOptions = useMemo(() => {
    if (!is24Hour) return Array.from({ length: 12 }, (_, index) => index + 1);
    return Array.from({ length: 24 }, (_, index) => index);
  }, [is24Hour]);

  const minuteOptions = useMemo(() => Array.from({ length: 12 }, (_, index) => index * 5), []);

  const openPicker = () => {
    const parsed = parseTime(value);
    setDraftHour(parsed.hour);
    setDraftMinute(parsed.minute);
    setStep("hour");
    setOpen(true);
  };

  const selectHour = (selected: number) => {
    if (is24Hour) setDraftHour(selected);
    else setDraftHour((selected % 12) + (period === "PM" ? 12 : 0));
    setStep("minute");
  };

  const setPeriod = (nextPeriod: Period) => {
    setDraftHour((draftHour % 12) + (nextPeriod === "PM" ? 12 : 0));
  };

  const confirm = () => {
    onChange(formatValue(draftHour, draftMinute));
    setOpen(false);
  };

  return (
    <>
      <button type="button" className="localized-time-trigger" aria-haspopup="dialog" aria-expanded={open} aria-label={t("Entry Time")} onClick={openPicker}>
        <span>{displayTime(current.hour, current.minute, is24Hour)}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
      </button>
      {required && <input type="hidden" required value={value} readOnly />}

      {open && (
        <div className="localized-time-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <div ref={dialogRef} className="localized-time-dialog" role="dialog" aria-modal="true" aria-label={t("Select time")} tabIndex={-1}>
            <div className="localized-time-display">
              <button type="button" className={step === "hour" ? "active" : ""} onClick={() => setStep("hour")}>{String(displayHour).padStart(is24Hour ? 2 : 1, "0")}</button>
              <span>:</span>
              <button type="button" className={step === "minute" ? "active" : ""} onClick={() => setStep("minute")}>{String(draftMinute).padStart(2, "0")}</button>
              {!is24Hour && (
                <div className="localized-time-period">
                  <button type="button" className={period === "AM" ? "active" : ""} onClick={() => setPeriod("AM")}>AM</button>
                  <button type="button" className={period === "PM" ? "active" : ""} onClick={() => setPeriod("PM")}>PM</button>
                </div>
              )}
            </div>

            <div className={`localized-clock-face localized-clock-face-${step}`}>
              <div className="localized-clock-hand" style={{ transform: `translateX(-50%) rotate(${step === "hour" ? ((is24Hour ? draftHour % 12 : displayHour % 12) * 30) : draftMinute * 6}deg)` }} />
              {step === "hour" ? hourOptions.map((option, index) => {
                const outer = !is24Hour || option === 0 || option > 12;
                const positionIndex = is24Hour ? option % 12 : index;
                const radius = is24Hour && !outer ? 66 : 102;
                const selected = option === draftHour || (!is24Hour && option === displayHour);
                return <button key={option} type="button" className={selected ? "selected" : ""} style={clockPosition(positionIndex, 12, radius)} aria-label={`${t("Hour")} ${option}`} onClick={() => selectHour(option)}>{String(option).padStart(is24Hour ? 2 : 1, "0")}</button>;
              }) : minuteOptions.map((option, index) => (
                <button key={option} type="button" className={option === draftMinute ? "selected" : ""} style={clockPosition(index, 12, 102)} aria-label={`${t("Minute")} ${option}`} onClick={() => setDraftMinute(option)}>{String(option).padStart(2, "0")}</button>
              ))}
              <span className="localized-clock-center" />
            </div>

            <div className="localized-time-actions">
              <button type="button" className="secondary-button" onClick={() => setOpen(false)}>{t("Cancel")}</button>
              <button type="button" onClick={confirm}>{t("OK")}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
