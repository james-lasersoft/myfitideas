import { useLocation, useNavigate } from "react-router-dom";
import { useAuthorization } from "../../auth/AuthorizationContext";
import { useLocale } from "../../i18n/LocaleContext";
import { rememberWorkspace, workspacePath, type WorkspaceId } from "../../workspaces/workspace";
import "./WorkspaceSwitcher.css";

export default function WorkspaceSwitcher() {
  const location = useLocation();
  const navigate = useNavigate();
  const { authorization, can } = useAuthorization();
  const { t } = useLocale();
  const token = localStorage.getItem("authToken");
  const isSuperAdministrator = authorization?.roles.includes("super-administrator") ?? false;

  if (!token || !can("admin.access") || location.pathname === "/workspace") return null;

  const current: WorkspaceId = location.pathname.startsWith("/system-operations")
    ? "operations"
    : location.pathname.startsWith("/admin")
      ? "organization"
      : "personal";

  const changeWorkspace = (workspace: WorkspaceId) => {
    if (workspace === current) return;
    rememberWorkspace(workspace);
    navigate(workspacePath(workspace));
  };

  return (
    <div className="workspace-switcher" role="group" aria-label={t("Switch workspace")}>
      <div className={`workspace-segmented-control${isSuperAdministrator ? " three-options" : ""}`}>
        <button type="button" className={current === "personal" ? "active" : ""} aria-pressed={current === "personal"} onClick={() => changeWorkspace("personal")}>
          {t("My Health")}
        </button>
        <button type="button" className={current === "organization" ? "active" : ""} aria-pressed={current === "organization"} onClick={() => changeWorkspace("organization")}>
          {t("MyFitIdeas Work")}
        </button>
        {isSuperAdministrator && (
          <button type="button" className={current === "operations" ? "active operations" : "operations"} aria-pressed={current === "operations"} onClick={() => changeWorkspace("operations")}>
            {t("System Operations")}
          </button>
        )}
      </div>
    </div>
  );
}
