import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useLocale } from "../i18n/LocaleContext";
import "./SecurityCenter.css";

interface SecurityUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  status: string;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  activeSessions: number;
  trustedDevices: number;
  roles: { key: string; name: string }[];
}

export default function AdminSecurityPage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [users, setUsers] = useState<SecurityUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadUsers = async () => {
    try {
      const response = await api.get<{ users: SecurityUser[] }>("/api/v1/admin/security/users");
      setUsers(response.data.users);
    } catch {
      setError(t("Unable to load security operations."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadUsers(); }, []);

  const resetMfa = async (user: SecurityUser) => {
    if (!window.confirm(t("Reset MFA and revoke all sessions for this user?"))) return;
    await api.post(`/api/v1/admin/security/users/${user.id}/reset-mfa`);
    setMessage(t("User MFA was reset and all sessions were revoked."));
    await loadUsers();
  };

  const revokeSessions = async (user: SecurityUser) => {
    if (!window.confirm(t("Revoke all active sessions for this user?"))) return;
    await api.post(`/api/v1/admin/security/users/${user.id}/revoke-sessions`);
    setMessage(t("All user sessions were revoked."));
    await loadUsers();
  };

  return (
    <main className="security-page ops-page">
      <section className="security-card">
        <header className="security-header">
          <div>
            <p className="section-eyebrow">{t("Administrative Security")}</p>
            <h1>{t("Security Operations")}</h1>
            <p>{t("Review MFA enrollment, trusted devices, and active sessions for company users.")}</p>
          </div>
          <button type="button" className="secondary-button" onClick={() => navigate("/admin")}>{t("Back to Administration")}</button>
        </header>

        {error && <p className="form-message error-message">{error}</p>}
        {message && <p className="form-message success-message">{message}</p>}

        {loading ? <p>{t("Loading security operations...")}</p> : (
          <table className="security-admin-table">
            <thead><tr><th>{t("User")}</th><th>{t("Roles")}</th><th>{t("MFA")}</th><th>{t("Active Sessions")}</th><th>{t("Trusted Devices")}</th><th>{t("Actions")}</th></tr></thead>
            <tbody>{users.map((user) => (
              <tr key={user.id}>
                <td><strong>{user.firstName} {user.lastName ?? ""}</strong><br/><small>{user.email}</small></td>
                <td>{user.roles.map((role) => role.name).join(", ") || t("None")}</td>
                <td>{user.mfaEnabled ? t("Enabled") : t("Not enrolled")}</td>
                <td>{user.activeSessions}</td>
                <td>{user.trustedDevices}</td>
                <td><div className="security-actions"><button type="button" className="secondary-button" onClick={() => void revokeSessions(user)}>{t("Revoke Sessions")}</button><button type="button" className="danger-button" onClick={() => void resetMfa(user)}>{t("Reset MFA")}</button></div></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </section>
    </main>
  );
}
