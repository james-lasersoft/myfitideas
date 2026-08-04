import { useLocation } from "react-router-dom";
import BrandLogo from "../BrandLogo";
import LanguageSelector from "../LanguageSelector";
import ThemeToggle from "../ThemeToggle";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import "./GlobalControls.css";

export default function GlobalControls() {
  const location = useLocation();
  const isAdminWorkspace = location.pathname.startsWith("/admin");

  return (
    <div className={`global-controls-bar${isAdminWorkspace ? " admin-global-controls" : ""}`}>
      {isAdminWorkspace && (
        <div className="admin-global-brand" aria-label="MyFitIdeas administration">
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
