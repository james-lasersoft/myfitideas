import type {
  PreferredDateFormat,
  PreferredTimeFormat,
  UserProfile,
} from "../services/profileService";

export interface LocalizationPreferences {
  preferredLanguage: UserProfile["preferredLanguage"];
  preferredDateFormat: PreferredDateFormat;
  preferredTimeFormat: PreferredTimeFormat;
  timezone: string;
}

function localeFor(language: LocalizationPreferences["preferredLanguage"]): string {
  return language === "pt-BR" ? "pt-BR" : "en-US";
}

function dateOptions(format: PreferredDateFormat): Intl.DateTimeFormatOptions {
  switch (format) {
    case "MM_DD_YYYY":
      return { month: "2-digit", day: "2-digit", year: "numeric" };
    case "DD_MM_YYYY":
      return { day: "2-digit", month: "2-digit", year: "numeric" };
    case "YYYY_MM_DD":
      return { year: "numeric", month: "2-digit", day: "2-digit" };
    default:
      return { year: "numeric", month: "long", day: "numeric" };
  }
}

export function formatUserDate(
  value: string | Date,
  preferences: LocalizationPreferences,
  overrides: Intl.DateTimeFormatOptions = {}
): string {
  return new Intl.DateTimeFormat(localeFor(preferences.preferredLanguage), {
    ...dateOptions(preferences.preferredDateFormat),
    timeZone: preferences.timezone,
    ...overrides,
  }).format(new Date(value));
}

export function formatUserTime(
  value: string | Date,
  preferences: LocalizationPreferences
): string {
  return new Intl.DateTimeFormat(localeFor(preferences.preferredLanguage), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: preferences.preferredTimeFormat === "12",
    hourCycle: preferences.preferredTimeFormat === "24" ? "h23" : undefined,
    timeZone: preferences.timezone,
  }).format(new Date(value));
}

export function currentTimeInputValue(
  preferences?: Pick<LocalizationPreferences, "timezone">
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: preferences?.timezone,
  }).formatToParts(new Date());

  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

export function isValidTimeInput(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
