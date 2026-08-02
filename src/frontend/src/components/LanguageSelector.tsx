import { useEffect, useMemo, useState } from "react";
import { useLocale } from "../i18n/LocaleContext";
import type { SupportedLocale } from "../i18n/translations";
import { updateProfile } from "../services/profileService";
import { getLanguages, type LanguageRecord } from "../services/translationAdminService";

const FALLBACK_LANGUAGES: LanguageRecord[] = [
  { id: "en-US", locale: "en-US", displayName: "English", nativeName: "English", enabled: true, isSource: true },
  { id: "pt-BR", locale: "pt-BR", displayName: "Portuguese (Brazil)", nativeName: "Português (Brasil)", enabled: true, isSource: false },
];

function localeFlag(locale: string): string {
  const region = locale.split("-")[1]?.toUpperCase();
  if (!region || region.length !== 2) return "🌐";
  return String.fromCodePoint(...region.split("").map((letter) => 127397 + letter.charCodeAt(0)));
}

export default function LanguageSelector() {
  const { locale, setLocale } = useLocale();
  const [isSaving, setIsSaving] = useState(false);
  const [languages, setLanguages] = useState<LanguageRecord[]>(FALLBACK_LANGUAGES);

  useEffect(() => {
    if (!localStorage.getItem("authToken")) return;
    getLanguages()
      .then((records) => {
        const enabled = records.filter((record) => record.enabled).slice(0, 4);
        if (enabled.length) setLanguages(enabled);
      })
      .catch((error) => console.warn("Unable to load enabled languages.", error));
  }, []);

  const options = useMemo(
    () => languages.filter((language) => language.locale === "en-US" || language.locale === "pt-BR"),
    [languages]
  );

  const handleChange = async (nextLocale: SupportedLocale) => {
    if (nextLocale === locale || isSaving) return;
    setLocale(nextLocale);

    const token = localStorage.getItem("authToken");
    if (!token) return;

    setIsSaving(true);
    try {
      const preferredLanguage = nextLocale === "en-US" ? "en" : "pt-BR";
      const profile = await updateProfile({ preferredLanguage });
      const currentUser = JSON.parse(localStorage.getItem("currentUser") ?? "{}") as Record<string, unknown>;
      localStorage.setItem("currentUser", JSON.stringify({ ...currentUser, preferredLanguage: profile.preferredLanguage }));
      if (window.location.pathname === "/profile") window.location.reload();
    } catch (error) {
      console.error("Unable to save language preference:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="language-selector" role="group" aria-label="Language" aria-busy={isSaving}>
      {options.map((option) => {
        const optionLocale = option.locale as SupportedLocale;
        const isActive = locale === optionLocale;
        const label = option.nativeName || option.displayName;
        return (
          <button
            key={option.locale}
            type="button"
            className={isActive ? "language-flag-button active" : "language-flag-button"}
            aria-label={label}
            aria-pressed={isActive}
            title={label}
            disabled={isSaving}
            onClick={() => void handleChange(optionLocale)}
          >
            <span className="language-flag-icon dynamic-flag" aria-hidden="true">{localeFlag(option.locale)}</span>
          </button>
        );
      })}
    </div>
  );
}
