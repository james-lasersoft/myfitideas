import { useEffect, useState } from "react";
import { useLocale } from "../i18n/LocaleContext";
import "./ThemeToggle.css";

type Theme = "light" | "dark";

const STORAGE_KEY = "myfitideas.theme";

function getInitialTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeToggle() {
  const { t } = useLocale();
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const nextTheme = theme === "dark" ? "light" : "dark";
  const label = theme === "dark" ? t("Switch to light mode") : t("Switch to dark mode");

  return (
    <button
      type="button"
      className="theme-toggle-button"
      aria-label={label}
      title={label}
      aria-pressed={theme === "dark"}
      onClick={() => setTheme(nextTheme)}
    >
      <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
    </button>
  );
}
