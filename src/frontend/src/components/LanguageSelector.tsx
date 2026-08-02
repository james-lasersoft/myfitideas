import { useState, type ReactNode } from "react";
import { useLocale } from "../i18n/LocaleContext";
import type { SupportedLocale } from "../i18n/translations";
import { updateProfile } from "../services/profileService";

function UsFlagIcon() {
  return (
    <svg viewBox="0 0 36 24" role="img" aria-hidden="true">
      <rect width="36" height="24" fill="#fff" />
      {[0, 4, 8, 12, 16, 20].map((y) => (
        <rect key={y} y={y} width="36" height="2" fill="#b22234" />
      ))}
      <rect width="15.5" height="13" fill="#3c3b6e" />
      {[
        [2, 2], [5, 2], [8, 2], [11, 2], [14, 2],
        [3.5, 5], [6.5, 5], [9.5, 5], [12.5, 5],
        [2, 8], [5, 8], [8, 8], [11, 8], [14, 8],
        [3.5, 11], [6.5, 11], [9.5, 11], [12.5, 11],
      ].map(([cx, cy], index) => (
        <circle key={index} cx={cx} cy={cy} r="0.55" fill="#fff" />
      ))}
    </svg>
  );
}

function BrazilFlagIcon() {
  return (
    <svg viewBox="0 0 36 24" role="img" aria-hidden="true">
      <rect width="36" height="24" fill="#009c3b" />
      <polygon points="18,3 32,12 18,21 4,12" fill="#ffdf00" />
      <circle cx="18" cy="12" r="5.4" fill="#002776" />
      <path d="M12.9 10.8c3.9-1.2 7.7-.5 10.4 1.7" fill="none" stroke="#fff" strokeWidth="1.1" />
      <circle cx="17" cy="10.4" r="0.45" fill="#fff" />
      <circle cx="20.4" cy="13.6" r="0.45" fill="#fff" />
      <circle cx="15.2" cy="14.2" r="0.38" fill="#fff" />
    </svg>
  );
}

const LANGUAGE_OPTIONS: Array<{
  locale: SupportedLocale;
  icon: ReactNode;
  label: string;
}> = [
  { locale: "en-US", icon: <UsFlagIcon />, label: "English (United States)" },
  { locale: "pt-BR", icon: <BrazilFlagIcon />, label: "Português (Brasil)" },
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
            <span className="language-flag-icon">{option.icon}</span>
          </button>
        );
      })}
    </div>
  );
}
