import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import Button from "../components/ui/Button";
import "./Admin.css";

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
          <p>Manage language content and prepare the operational controls that will be secured by RBAC in the next phase.</p>
        </div>
        <Button variant="outline" leadingIcon="←" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
      </header>

      <section className="admin-module-grid" aria-label="Administrative modules">
        <article className="admin-module-card active-module">
          <span className="module-status ready">Available</span>
          <h2>Translation Management</h2>
          <p>Edit, review, and publish English and Brazilian Portuguese interface content.</p>
          <Button onClick={() => navigate("/admin/translations")}>Open Translation Manager</Button>
        </article>

        {plannedModules.map(([title, description]) => (
          <article className="admin-module-card" key={title}>
            <span className="module-status">Planned</span>
            <h2>{title}</h2>
            <p>{description}</p>
            <Button variant="outline" disabled>Coming in RBAC phase</Button>
          </article>
        ))}
      </section>
    </main>
  );
}
