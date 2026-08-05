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
  superAdminOnly?: boolean;
}

const modules: AdminModule[] = [
  { title: "Translation Management", description: "Edit, review, and publish multilingual interface content.", action: "Open Translation Manager", path: "/admin/translations", permission: "translations.read" },
  { title: "User Management", description: "Invite users, assign roles, manage account status, and revoke sessions.", action: "Open User Management", path: "/admin/users", permission: "users.read" },
  { title: "Roles & Permissions", description: "Create organization roles and configure effective permissions.", action: "Open Role Management", path: "/admin/roles", permission: "roles.read" },
  { title: "Security Operations", description: "Review MFA enrollment, trusted devices, and active user sessions.", action: "Open Security Operations", path: "/admin/security", permission: "system.operations" },
  { title: "Company Settings", description: "Configure provider-neutral services and organization security policies.", action: "Open Company Settings", path: "/admin/settings", permission: "system.operations" },
  { title: "Synthetic Test Data", description: "Generate realistic development-only weight, body measurement, and hydration history for an existing test user.", action: "Open Test Data Generator", path: "/admin/synthetic-data", permission: "system.operations", superAdminOnly: true },
  { title: "Audit Logs", description: "Review security-sensitive and administrative events.", action: "Open Audit Log", path: "/admin/audit", permission: "audit.read" },
];

export default function AdminLandingPage() {
  const navigate = useNavigate();
  const { authorization, can } = useAuthorization();
  const { t } = useLocale();
  const isSuperAdmin = authorization?.roles.includes("super-administrator") ?? false;
  const available = modules.filter((module) => can(module.permission) && (!module.superAdminOnly || isSuperAdmin));

  return (
    <main className="admin-page admin-console-page">
      <AdminPageHeader
        eyebrow={t("Company administration")}
        title={t("Admin Center")}
        description={t("Manage users, roles, translations, security activity, and organization controls.")}
        backLabel={t("Back to Dashboard")}
        onBack={() => navigate("/dashboard")}
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
      </section>
    </main>
  );
}
