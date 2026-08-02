import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale } from "../i18n/LocaleContext";
import type { SupportedLocale } from "../i18n/translations";
import { updateProfile } from "../services/profileService";
import {
  getLanguages,
  type LanguageRecord,
} from "../services/translationAdminService";

const FALLBACK_LANGUAGES: LanguageRecord[] = [
  {
    id: "en-US",
    locale: "en-US",
    displayName: "English",
    nativeName: "English",
    enabled: true,
    isSource: true,
  },
  {
    id: "pt-BR",
    locale: "pt-BR",
    displayName: "Portuguese (Brazil)",
    nativeName: "Português (Brasil)",
    enabled: true,
    isSource: false,
  },
];

function UsFlagIcon() {
  return (
    <svg viewBox="0 0 36 24" role="img" aria-hidden="true">
      <rect width="36" height="24" fill="#fff" />
      {[0, 4, 8, 12, 16, 20].map((y) => (
        <rect key={y} y={y} width="36" height="2" fill="#b22234" />
      ))}
      <rect width="15.5" height="13" fill="#3c3b6e" />
      {[
        [2, 2],
        [5, 2],
        [8, 2],
        [11, 2],
        [14, 2],
        [3.5, 5],
        [6.5, 5],
        [9.5, 5],
        [12.5, 5],
        [2, 8],
        [5, 8],
        [8, 8],
        [11, 8],
        [14, 8],
        [3.5, 11],
        [6.5, 11],
        [9.5, 11],
        [12.5, 11],
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
      <path
        d="M12.9 10.8c3.9-1.2 7.7-.5 10.4 1.7"
        fill="none"
        stroke="#fff"
        strokeWidth="1.1"
      />
      <circle cx="17" cy="10.4" r="0.45" fill="#fff" />
      <circle cx="20.4" cy="13.6" r="0.45" fill="#fff" />
      <circle cx="15.2" cy="14.2" r="0.38" fill="#fff" />
    </svg>
  );
}

function RegionFallbackIcon({ locale }: { locale: string }) {
  const region = locale.split("-")[1]?.toUpperCase() ?? "--";

  return (
    <svg viewBox="0 0 36 24" role="img" aria-hidden="true">
      <rect width="36" height="24" rx="2" fill="#eef5f0" />
      <rect
        x="0.75"
        y="0.75"
        width="34.5"
        height="22.5"
        rx="1.5"
        fill="none"
        stroke="#1f8b43"
        strokeWidth="1.5"
      />
      <text
        x="18"
        y="15.5"
        textAnchor="middle"
        fill="#185f32"
        fontSize="9"
        fontWeight="700"
        fontFamily="Arial, sans-serif"
      >
        {region}
      </text>
    </svg>
  );
}

function getFlagIcon(locale: string): ReactNode {
  switch (locale) {
    case "en-US":
      return <UsFlagIcon />;
    case "pt-BR":
      return <BrazilFlagIcon />;
    default:
      return <RegionFallbackIcon locale={locale} />;
  }
}

export default function LanguageSelector() {
  const { locale, setLocale } = useLocale();
  const [isSaving, setIsSaving] = useState(false);
  const [languages, setLanguages] =
    useState<LanguageRecord[]>(FALLBACK_LANGUAGES);

  useEffect(() => {
    if (!localStorage.getItem("authToken")) return;

    getLanguages()
      .then((records) => {
        const enabled = records
          .filter((record) => record.enabled)
          .slice(0, 4);

        if (enabled.length) setLanguages(enabled);
      })
      .catch((error) =>
        console.warn("Unable to load enabled languages.", error)
      );
  }, []);

  const options = useMemo(
    () =>
      languages.filter(
        (language) =>
          language.locale === "en-US" || language.locale === "pt-BR"
      ),
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
      {options.map((option) => {
        const optionLocale = option.locale as SupportedLocale;
        const isActive = locale === optionLocale;
        const label = option.nativeName || option.displayName;

        return (
          <button
            key={option.locale}
            type="button"
            className={
              isActive
                ? "language-flag-button active"
                : "language-flag-button"
            }
            aria-label={label}
            aria-pressed={isActive}
            title={label}
            disabled={isSaving}
            onClick={() => void handleChange(optionLocale)}
          >
            <span className="language-flag-icon" aria-hidden="true">
              {getFlagIcon(option.locale)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
