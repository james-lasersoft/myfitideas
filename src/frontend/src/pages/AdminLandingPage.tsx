import { useNavigate } from "react-router-dom";
import { useAuthorization } from "../auth/AuthorizationContext";
import { AdminModuleCard, AdminPageHeader } from "../components/admin/AdminComponents";
import { useLocale } from "../i18n/LocaleContext";
import "./Admin.css";
import "./AdminConsoleTheme.css";
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
      <AdminPageHeader
        eyebrow={t("Company administration")}
        title={t("Administration Center")}
        description={t("Manage users, roles, translations, security activity, and organization controls.")}
        backLabel={t("Back to Dashboard")}
        onBack={() => navigate("/dashboard")}
        showLogo
      />

      <section className="admin-module-grid" aria-label={t("Administrative modules")}>
        {available.map((module) => (
          <AdminModuleCard
            key={module.path}
            title={t(module.title)}
            description={t(module.description)}
            action={t(module.action)}
            onClick={() => navigate(module.path)}
            ariaLabel={t(module.action)}
          />
        ))}

        <AdminModuleCard
          title={t("System Settings")}
          description={t("Manage operational configuration and feature controls.")}
          action={t("Coming in a future phase")}
          disabled
        />
      </section>
    </main>
  );
}
