import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import Button from "../components/ui/Button";
import "./Admin.css";
import "./AdminTiles.css";

const plannedModules = [
  ["Users", "Manage company and customer accounts."],
  ["Roles & Permissions", "Configure RBAC roles and effective permissions."],
  ["Billing Operations", "Review plans, subscriptions, and billing exceptions."],
  ["Audit Logs", "Review security-sensitive and administrative events."],
  ["System Settings", "Manage operational configuration and feature controls."],
];

export default function AdminLandingPage() {
  const navigate = useNavigate();

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <BrandLogo className="admin-logo" />
          <p className="admin-eyebrow">Company administration</p>
          <h1>Administration Center</h1>
          <p>
            Manage language content and prepare the operational controls that will be secured by
            RBAC in the next phase.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </Button>
      </header>

      <section className="admin-module-grid" aria-label="Administrative modules">
        <button
          type="button"
          className="admin-module-card admin-module-tile active-module"
          onClick={() => navigate("/admin/translations")}
          aria-label="Open Translation Manager"
        >
          <span className="module-status ready">Available</span>
          <span className="admin-module-title">Translation Management</span>
          <span className="admin-module-description">
            Edit, review, and publish English and Brazilian Portuguese interface content.
          </span>
          <span className="admin-module-action">Open Translation Manager</span>
        </button>

        {plannedModules.map(([title, description]) => (
          <button
            type="button"
            className="admin-module-card admin-module-tile planned-module"
            key={title}
            disabled
          >
            <span className="module-status">Planned</span>
            <span className="admin-module-title">{title}</span>
            <span className="admin-module-description">{description}</span>
            <span className="admin-module-action">Coming in RBAC phase</span>
          </button>
        ))}
      </section>
    </main>
  );
}
