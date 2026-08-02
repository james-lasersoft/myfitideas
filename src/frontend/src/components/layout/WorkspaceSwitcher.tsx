import { useLocation, useNavigate } from "react-router-dom";
import { useAuthorization } from "../../auth/AuthorizationContext";
import { useLocale } from "../../i18n/LocaleContext";
import { rememberWorkspace, workspacePath, type WorkspaceId } from "../../workspaces/workspace";
import "./WorkspaceSwitcher.css";

export default function WorkspaceSwitcher() {
  const location = useLocation();
  const navigate = useNavigate();
  const { can } = useAuthorization();
  const { t } = useLocale();
  const token = localStorage.getItem("authToken");

  if (!token || !can("admin.access") || location.pathname === "/workspace") return null;

  const current: WorkspaceId = location.pathname.startsWith("/admin") ? "organization" : "personal";

  const changeWorkspace = (workspace: WorkspaceId) => {
    rememberWorkspace(workspace);
    navigate(workspacePath(workspace));
  };

  return (
    <label className="workspace-switcher">
      <span>{t("Workspace")}</span>
      <select value={current} onChange={(event) => changeWorkspace(event.target.value as WorkspaceId)} aria-label={t("Switch workspace")}>
        <option value="personal">{t("My Health")}</option>
        <option value="organization">{t("MyFitIdeas Work")}</option>
      </select>
    </label>
  );
}
