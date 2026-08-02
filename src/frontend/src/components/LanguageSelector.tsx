import { useState, type ChangeEvent } from "react";
import { useLocale } from "../i18n/LocaleContext";
import type { SupportedLocale } from "../i18n/translations";
import { updateProfile } from "../services/profileService";

export default function LanguageSelector() {
  const { locale, setLocale } = useLocale();
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    const nextLocale = event.target.value as SupportedLocale;
    setLocale(nextLocale);

    const token = localStorage.getItem("authToken");
    if (!token) return;

    setIsSaving(true);
    try {
      const preferredLanguage = nextLocale === "en-US" ? "en" : "pt-BR";
      const profile = await updateProfile({ preferredLanguage });
      const currentUser = JSON.parse(localStorage.getItem("currentUser") ?? "{}") as Record<string, unknown>;
      localStorage.setItem(
        "currentUser",
        JSON.stringify({ ...currentUser, preferredLanguage: profile.preferredLanguage })
      );
    } catch (error) {
      console.error("Unable to save language preference:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <label className="language-selector">
      <span className="sr-only">Language</span>
      <select
        aria-label="Language"
        value={locale}
        onChange={handleChange}
        disabled={isSaving}
      >
        <option value="en-US">English</option>
        <option value="pt-BR">Português (Brasil)</option>
      </select>
    </label>
  );
}
