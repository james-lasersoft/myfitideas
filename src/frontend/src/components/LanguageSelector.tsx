import { useState } from "react";
import { useLocale } from "../i18n/LocaleContext";
import type { SupportedLocale } from "../i18n/translations";
import { updateProfile } from "../services/profileService";

const LANGUAGE_OPTIONS: Array<{
  locale: SupportedLocale;
  flag: string;
  label: string;
}> = [
  { locale: "en-US", flag: "🇺🇸", label: "English (United States)" },
  { locale: "pt-BR", flag: "🇧🇷", label: "Português (Brasil)" },
];

export default function LanguageSelector() {
  const { locale, setLocale } = useLocale();
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = async (nextLocale: SupportedLocale) => {
    if (nextLocale === locale || isSaving) return;

    setLocale(nextLocale);

    const token = localStorage.getItem("authToken");
    if (!token) return;

    setIsSaving(true);
    try {
      const preferredLanguage = nextLocale === "en-US" ? "en" : "pt-BR";
      const profile = await updateProfile({ preferredLanguage });
      const currentUser = JSON.parse(
        localStorage.getItem("currentUser") ?? "{}"
      ) as Record<string, unknown>;

      localStorage.setItem(
        "currentUser",
        JSON.stringify({
          ...currentUser,
          preferredLanguage: profile.preferredLanguage,
        })
      );

      // The profile form maintains a local copy of profile preferences. Reloading
      // only this page prevents a later profile save from restoring stale language data.
      if (window.location.pathname === "/profile") {
        window.location.reload();
      }
    } catch (error) {
      console.error("Unable to save language preference:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="language-selector"
      role="group"
      aria-label="Language"
      aria-busy={isSaving}
    >
      {LANGUAGE_OPTIONS.map((option) => {
        const isActive = locale === option.locale;

        return (
          <button
            key={option.locale}
            type="button"
            className={
              isActive
                ? "language-flag-button active"
                : "language-flag-button"
            }
            aria-label={option.label}
            aria-pressed={isActive}
            title={option.label}
            disabled={isSaving}
            onClick={() => void handleChange(option.locale)}
          >
            <span aria-hidden="true">{option.flag}</span>
          </button>
        );
      })}
    </div>
  );
}
