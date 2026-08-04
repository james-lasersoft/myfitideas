import { useNavigate } from "react-router-dom";
import { useAuthorization } from "../auth/AuthorizationContext";
import BrandLogo from "../components/BrandLogo";
import Button from "../components/ui/Button";
import { useLocale } from "../i18n/LocaleContext";
import "./Admin.css";
import "./AdminTiles.css";

interface AdminModule {
  title: string;
  description: string;
  action: string;
  path: string;
  permission: string;
}

const modules: AdminModule[] = [
  { title: "Translation Management", description: "Edit, review, and publish multilingual interface content.", action: "Open Translation Manager", path: "/admin/translations", permission: "translations.read" },
  { title: "User Management", description: "Invite users, assign roles, manage account status, and revoke sessions.", action: "Open User Management", path: "/admin/users", permission: "users.read" },
  { title: "Roles & Permissions", description: "Create organization roles and configure effective permissions.", action: "Open Role Management", path: "/admin/roles", permission: "roles.read" },
  { title: "Security Operations", description: "Review MFA enrollment, trusted devices, and active user sessions.", action: "Open Security Operations", path: "/admin/security", permission: "system.operations" },
  { title: "Audit Logs", description: "Review security-sensitive and administrative events.", action: "Open Audit Log", path: "/admin/audit", permission: "audit.read" },
];

export default function AdminLandingPage() {
  const navigate = useNavigate();
  const { can } = useAuthorization();
  const { t } = useLocale();
  const available = modules.filter((module) => can(module.permission));

  return (
    <main className="admin-page admin-console-page">
      <header className="admin-header">
        <div>
          <BrandLogo className="admin-logo" />
          <p className="admin-eyebrow">{t("Company administration")}</p>
          <h1>{t("Administration Center")}</h1>
          <p>{t("Manage users, roles, translations, security activity, and organization controls.")}</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>{t("Back to Dashboard")}</Button>
      </header>

      <section className="admin-module-grid" aria-label={t("Administrative modules")}>
        {available.map((module) => (
          <button
            type="button"
            className="admin-module-card admin-module-tile active-module"
            key={module.path}
            onClick={() => navigate(module.path)}
            aria-label={t(module.action)}
          >
            <span className="admin-module-title">{t(module.title)}</span>
            <span className="admin-module-description">{t(module.description)}</span>
            <span className="admin-module-action">{t(module.action)}</span>
          </button>
        ))}

        <article className="admin-module-card admin-module-tile planned-module" aria-disabled="true">
          <span className="admin-module-title">{t("System Settings")}</span>
          <span className="admin-module-description">{t("Manage operational configuration and feature controls.")}</span>
          <span className="admin-module-action future-module-note">{t("Coming in a future phase")}</span>
        </article>
      </section>
    </main>
  );
}
