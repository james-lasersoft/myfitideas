import { useLocation } from "react-router-dom";
import { useLocale } from "../../i18n/LocaleContext";
import BrandLogo from "../BrandLogo";
import LanguageSelector from "../LanguageSelector";
import ThemeToggle from "../ThemeToggle";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import "./GlobalControls.css";

export default function GlobalControls() {
  const location = useLocation();
  const { t } = useLocale();
  const isAdminWorkspace = location.pathname.startsWith("/admin");

  return (
    <div className={`global-controls-bar${isAdminWorkspace ? " admin-global-controls" : ""}`}>
      {isAdminWorkspace && (
        <div className="admin-global-brand" aria-label={t("MyFitIdeas Admin Center")}>
          <BrandLogo className="admin-global-logo" />
        </div>
      )}
      <div className="global-controls-group">
        <WorkspaceSwitcher />
        <ThemeToggle />
        <LanguageSelector />
      </div>
    </div>
  );
}
