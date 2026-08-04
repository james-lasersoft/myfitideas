import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminBadge, AdminLoadingState, AdminPageHeader } from "../components/admin/AdminComponents";
import { useLocale } from "../i18n/LocaleContext";
import api from "../services/api";
import "./Admin.css";
import "./AdminConsoleTheme.css";
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
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const summary = useMemo(() => ({
    totalUsers: users.length,
    mfaEnabled: users.filter((user) => user.mfaEnabled).length,
    withoutMfa: users.filter((user) => !user.mfaEnabled).length,
    activeSessions: users.reduce((total, user) => total + user.activeSessions, 0),
  }), [users]);

  const refreshUsers = async (): Promise<void> => {
    const response = await api.get<{ users: SecurityUser[] }>("/api/v1/admin/security/users");
    setUsers(response.data.users);
  };

  useEffect(() => {
    let active = true;

    void api.get<{ users: SecurityUser[] }>("/api/v1/admin/security/users")
      .then((response) => {
        if (!active) return;
        setUsers(response.data.users);
        setError("");
      })
      .catch(() => {
        if (active) setError(t("Unable to load security operations."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [t]);

  const resetMfa = async (user: SecurityUser) => {
    if (!window.confirm(t("Reset MFA and revoke all sessions for this user?"))) return;
    setBusyUserId(user.id);
    setError("");
    setMessage("");
    try {
      await api.post(`/api/v1/admin/security/users/${user.id}/reset-mfa`);
      setMessage(t("User MFA was reset and all sessions were revoked."));
      await refreshUsers();
    } catch {
      setError(t("Unable to reset MFA."));
    } finally {
      setBusyUserId(null);
    }
  };

  const revokeSessions = async (user: SecurityUser) => {
    if (!window.confirm(t("Revoke all active sessions for this user?"))) return;
    setBusyUserId(user.id);
    setError("");
    setMessage("");
    try {
      await api.post(`/api/v1/admin/security/users/${user.id}/revoke-sessions`);
      setMessage(t("All user sessions were revoked."));
      await refreshUsers();
    } catch {
      setError(t("Unable to revoke active sessions."));
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <main className="admin-page admin-console-page security-page ops-page">
      <AdminPageHeader
        eyebrow={t("Administrative Security")}
        title={t("Security Operations")}
        description={t("Review MFA enrollment, trusted devices, and active sessions for company users.")}
        backLabel={t("Back to Administration")}
        onBack={() => navigate("/admin")}
      />

      <section className="security-summary-grid" aria-label={t("Security Overview")}>
        <article className="security-summary-card"><span>{t("Total Users")}</span><strong>{summary.totalUsers}</strong></article>
        <article className="security-summary-card"><span>{t("MFA Enabled")}</span><strong>{summary.mfaEnabled}</strong></article>
        <article className="security-summary-card"><span>{t("Users Without MFA")}</span><strong>{summary.withoutMfa}</strong></article>
        <article className="security-summary-card"><span>{t("Active Sessions")}</span><strong>{summary.activeSessions}</strong></article>
      </section>

      <section className="security-card security-operations-card">
        {error && <p className="form-message error-message" role="alert">{error}</p>}
        {message && <p className="form-message success-message" role="status">{message}</p>}

        {loading ? <AdminLoadingState label={t("Loading security operations...")} /> : (
          <div className="security-admin-table-wrap">
            <table className="security-admin-table compact-security-table">
              <thead>
                <tr>
                  <th>{t("User")}</th>
                  <th>{t("Roles")}</th>
                  <th>{t("Last Login")}</th>
                  <th className="numeric-column">{t("MFA")}</th>
                  <th className="numeric-column">{t("Active Sessions")}</th>
                  <th className="numeric-column">{t("Trusted Devices")}</th>
                  <th>{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const busy = busyUserId === user.id;
                  return (
                    <tr key={user.id} aria-busy={busy}>
                      <td className="security-user-cell">
                        <strong>{user.firstName} {user.lastName ?? ""}</strong>
                        <small>{user.email}</small>
                      </td>
                      <td>
                        <div className="security-role-list">
                          {user.roles.length
                            ? user.roles.map((role) => <AdminBadge key={role.key} tone="info">{role.name}</AdminBadge>)
                            : <span className="security-empty-value">{t("None")}</span>}
                        </div>
                      </td>
                      <td className="security-last-login">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : t("Never")}
                      </td>
                      <td className="numeric-column">
                        <AdminBadge tone={user.mfaEnabled ? "success" : "warning"} dot>
                          {user.mfaEnabled ? t("Enabled") : t("Not enrolled")}
                        </AdminBadge>
                      </td>
                      <td className="numeric-column"><span className="security-count-badge">{user.activeSessions}</span></td>
                      <td className="numeric-column"><span className="security-count-badge">{user.trustedDevices}</span></td>
                      <td>
                        <div className="security-actions compact-actions">
                          <button type="button" className="secondary-button compact-security-action" disabled={busy} onClick={() => void revokeSessions(user)}>{t("Revoke Sessions")}</button>
                          <button type="button" className="danger-button compact-security-action" disabled={busy} onClick={() => void resetMfa(user)}>{t("Reset MFA")}</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
