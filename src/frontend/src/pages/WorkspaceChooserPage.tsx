import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { useAuthorization } from "../auth/AuthorizationContext";
import { useLocale } from "../i18n/LocaleContext";
import { rememberWorkspace, workspacePath, type WorkspaceId } from "../workspaces/workspace";
import "./WorkspaceChooserPage.css";

export default function WorkspaceChooserPage() {
  const navigate = useNavigate();
  const { can } = useAuthorization();
  const { t } = useLocale();
  const hasOrganizationWorkspace = can("admin.access");

  const choose = (workspace: WorkspaceId) => {
    rememberWorkspace(workspace);
    navigate(workspacePath(workspace), { replace: true });
  };

  return (
    <main className="workspace-page">
      <section className="workspace-card" aria-labelledby="workspace-heading">
        <BrandLogo className="workspace-logo" />
        <p className="workspace-eyebrow">{t("Choose your workspace")}</p>
        <h1 id="workspace-heading">{t("Where would you like to start today?")}</h1>
        <p>{t("You can switch workspaces at any time from the page header.")}</p>

        <div className="workspace-grid">
          <button type="button" className="workspace-option" onClick={() => choose("personal")}>
            <span className="workspace-option-status">{t("Personal")}</span>
            <strong>{t("My Health")}</strong>
            <span>{t("Track hydration, measurements, goals, and personal progress.")}</span>
            <span className="workspace-option-action">{t("Open My Health")} →</span>
          </button>

          {hasOrganizationWorkspace && (
            <button type="button" className="workspace-option workspace-option-work" onClick={() => choose("organization")}>
              <span className="workspace-option-status">{t("Work")}</span>
              <strong>{t("MyFitIdeas Work")}</strong>
              <span>{t("Manage users, roles, translations, audit activity, and organization controls.")}</span>
              <span className="workspace-option-action">{t("Open MyFitIdeas Work")} →</span>
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
