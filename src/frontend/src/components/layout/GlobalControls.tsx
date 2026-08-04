import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLocale } from "../../i18n/LocaleContext";
import api from "../../services/api";
import BrandLogo from "../BrandLogo";
import LanguageSelector from "../LanguageSelector";
import ThemeToggle from "../ThemeToggle";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import "./GlobalControls.css";

function readSessionId(token: string): string | null {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(normalized)) as { sessionId?: unknown };
    return typeof payload.sessionId === "string" ? payload.sessionId : null;
  } catch {
    return null;
  }
}

export default function GlobalControls() {
  const location = useLocation();
  const { t } = useLocale();
  const isAdminWorkspace = location.pathname.startsWith("/admin");

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    const sessionId = readSessionId(token);
    if (!sessionId) return;
    const storageKey = `myfitideas-location-enriched:${sessionId}`;
    if (sessionStorage.getItem(storageKey)) return;

    sessionStorage.setItem(storageKey, "pending");
    void api.post("/api/auth/security/session/location")
      .then(() => sessionStorage.setItem(storageKey, "complete"))
      .catch(() => sessionStorage.removeItem(storageKey));
  }, [location.pathname]);

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
