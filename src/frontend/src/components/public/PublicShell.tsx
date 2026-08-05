import { NavLink, Outlet } from "react-router-dom";
import BrandLogo from "../BrandLogo";
import LanguageSelector from "../LanguageSelector";
import ThemeToggle from "../ThemeToggle";
import { useLocale } from "../../i18n/LocaleContext";
import "./PublicShell.css";

export default function PublicShell() {
  const { t } = useLocale();

  return (
    <div className="public-shell">
      <header className="public-header">
        <div className="public-header-inner">
          <NavLink className="public-brand" to="/" aria-label={t("MyFitIdeas home")}>
            <BrandLogo className="public-brand-logo" />
          </NavLink>

          <nav className="public-navigation" aria-label={t("Public navigation")}>
            <NavLink to="/features">{t("Features")}</NavLink>
            <NavLink to="/pricing">{t("Pricing")}</NavLink>
            <NavLink to="/login">{t("Log In")}</NavLink>
          </nav>

          <div className="public-header-actions">
            <ThemeToggle />
            <LanguageSelector />
            <NavLink className="public-signup-link" to="/create-account">{t("Create Account")}</NavLink>
          </div>
        </div>
      </header>

      <main className="public-main">
        <Outlet />
      </main>

      <footer className="public-footer">
        <div>
          <strong>MyFitIdeas</strong>
          <p>{t("A privacy-conscious platform for long-term body transformation.")}</p>
        </div>
        <nav aria-label={t("Legal navigation")}>
          <NavLink to="/privacy">{t("Privacy")}</NavLink>
          <NavLink to="/terms">{t("Terms")}</NavLink>
        </nav>
      </footer>
    </div>
  );
}
