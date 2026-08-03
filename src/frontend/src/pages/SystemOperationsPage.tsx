import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthorization } from "../auth/AuthorizationContext";
import Button from "../components/ui/Button";
import { useLocale } from "../i18n/LocaleContext";
import "./SystemOperationsPage.css";

const workspaceKey = "myfitideas.workspace.selection";
const localeKey = "myfitideas.locale";
const themeKeys = ["myfitideas.theme", "theme"];

export default function SystemOperationsPage() {
  const navigate = useNavigate();
  const { authorization } = useAuthorization();
  const { locale, t } = useLocale();
  const [message, setMessage] = useState("");

  const environment = import.meta.env.MODE.toUpperCase();
  const details = useMemo(() => ({
    environment,
    organization: authorization?.organizationName ?? t("Not available"),
    roles: authorization?.roles.join(", ") || t("Not available"),
    permissions: authorization?.permissions.length ?? 0,
    locale,
    workspace: localStorage.getItem(workspaceKey) ? t("Saved") : t("Not selected"),
  }), [authorization, environment, locale, t]);

  const resetWorkspace = () => {
    localStorage.removeItem(workspaceKey);
    setMessage(t("Workspace selection reset. The chooser will appear at the next login."));
  };

  const resetLanguage = () => {
    localStorage.removeItem(localeKey);
    setMessage(t("Language cache reset. Reload the page to use the browser default."));
  };

  const resetTheme = () => {
    themeKeys.forEach((key) => localStorage.removeItem(key));
    setMessage(t("Theme preference reset. Reload the page to use the system default."));
  };

  const clearSession = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("authorization");
    localStorage.removeItem(workspaceKey);
    window.location.assign("/");
  };

  const clearLocalSettings = () => {
    const preservedKeys = new Set<string>();
    Object.keys(localStorage).forEach((key) => {
      if (!preservedKeys.has(key)) localStorage.removeItem(key);
    });
    window.location.assign("/");
  };

  return (
    <main className="ops-page">
      <header className="ops-header">
        <div>
          <p className="ops-eyebrow">{t("Super Administrator")}</p>
          <h1>{t("System Operations")}</h1>
          <p>{t("Developer utilities, diagnostics, and operational visibility for the MyFitIdeas platform.")}</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/admin")}>{t("Open Work Administration")}</Button>
      </header>

      <section className="ops-status-grid" aria-label={t("System status overview")}>
        <article className="ops-status-card healthy"><span>{t("Application")}</span><strong>{t("Healthy")}</strong><small>{t("Frontend is responding")}</small></article>
        <article className="ops-status-card healthy"><span>{t("Database")}</span><strong>{t("Connected")}</strong><small>{t("Prisma data services available")}</small></article>
        <article className="ops-status-card informational"><span>{t("Monitoring")}</span><strong>{t("Foundation")}</strong><small>{t("Live metrics collection is planned")}</small></article>
        <article className="ops-status-card informational"><span>{t("Email")}</span><strong>{t("Not configured")}</strong><small>{t("Console and Amazon SES providers are planned")}</small></article>
      </section>

      <section className="ops-layout">
        <article className="ops-panel">
          <div className="ops-panel-heading"><div><p>{t("Developer Tools")}</p><h2>{t("Local browser controls")}</h2></div><span className="ops-badge">{t("Super Admin Only")}</span></div>
          <div className="ops-tool-grid">
            <button type="button" className="ops-tool" onClick={resetWorkspace}><strong>{t("Reset Workspace Selection")}</strong><span>{t("Show the daily workspace chooser again.")}</span></button>
            <button type="button" className="ops-tool" onClick={resetLanguage}><strong>{t("Reset Language Cache")}</strong><span>{t("Return language selection to the browser default.")}</span></button>
            <button type="button" className="ops-tool" onClick={resetTheme}><strong>{t("Reset Theme")}</strong><span>{t("Return appearance to the system default.")}</span></button>
            <button type="button" className="ops-tool danger" onClick={clearSession}><strong>{t("Clear Login Session")}</strong><span>{t("Sign out and clear cached authorization data.")}</span></button>
            <button type="button" className="ops-tool danger" onClick={clearLocalSettings}><strong>{t("Clear All Local Settings")}</strong><span>{t("Remove all MyFitIdeas browser data on this device.")}</span></button>
          </div>
          {message && <p className="ops-message" role="status">{message}</p>}
        </article>

        <article className="ops-panel">
          <div className="ops-panel-heading"><div><p>{t("Diagnostics")}</p><h2>{t("Current session details")}</h2></div></div>
          <dl className="ops-details">
            <div><dt>{t("Environment")}</dt><dd>{details.environment}</dd></div>
            <div><dt>{t("Organization")}</dt><dd>{details.organization}</dd></div>
            <div><dt>{t("Roles")}</dt><dd>{details.roles}</dd></div>
            <div><dt>{t("Permission count")}</dt><dd>{details.permissions}</dd></div>
            <div><dt>{t("Current locale")}</dt><dd>{details.locale}</dd></div>
            <div><dt>{t("Workspace selection")}</dt><dd>{details.workspace}</dd></div>
          </dl>
        </article>
      </section>

      <section className="ops-panel metrics-preview">
        <div className="ops-panel-heading"><div><p>{t("Operations Monitor")}</p><h2>{t("Future live metrics dashboard")}</h2></div><span className="ops-badge planned">{t("Planned")}</span></div>
        <p>{t("This screen will continuously evaluate platform health and highlight degraded or critical readings.")}</p>
        <div className="metrics-preview-grid">
          {["Registered users", "Users online", "API response time", "Error rate", "Database writes", "Active connections", "Email delivery", "System uptime"].map((label) => (
            <div key={label}><span>{t(label)}</span><strong>{t("Awaiting telemetry")}</strong></div>
          ))}
        </div>
      </section>
    </main>
  );
}
