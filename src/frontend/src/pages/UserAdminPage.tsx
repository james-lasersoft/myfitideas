import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import { useLocale } from "../i18n/LocaleContext";
import { assignUserRoles, createInvitation, getAdminUsers, getRoles, revokeUserSessions, setUserStatus, type AdminUser, type RoleRecord } from "../services/rbacService";
import "./SecurityAdmin.css";

export default function UserAdminPage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (query = search) => {
    setLoading(true);
    try {
      const [userResult, roleResult] = await Promise.all([getAdminUsers(query), getRoles()]);
      setUsers(userResult.items);
      setRoles(roleResult);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void Promise.resolve().then(() => load(""));
  }, [load]);

  const invite = async () => {
    const result = await createInvitation(email, inviteRole || undefined);
    setInviteLink(`${window.location.origin}${result.invitationPath}`);
    setMessage(t("Invitation created. Copy the secure link below."));
    setEmail("");
  };

  return (
    <main className="admin-page security-admin-page">
      <header className="admin-header compact">
        <div><p className="admin-eyebrow">{t("Administration / Users")}</p><h1>{t("User Management")}</h1><p>{t("Invite users, assign roles, control account status, and revoke active sessions.")}</p></div>
        <Button variant="outline" onClick={() => navigate("/admin")}>{t("Back to Admin")}</Button>
      </header>

      <section className="security-panel">
        <h2>{t("Invite User")}</h2>
        <div className="security-form-row">
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t("Email address")} type="email" />
          <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}>
            <option value="">{t("Select role")}</option>
            {roles.filter((role) => role.isActive).map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
          </select>
          <Button onClick={() => void invite()} disabled={!email}>{t("Create Invitation")}</Button>
        </div>
        {message && <p className="success-message">{message}</p>}
        {inviteLink && <div className="invitation-link"><input readOnly value={inviteLink} /><Button variant="outline" onClick={() => void navigator.clipboard.writeText(inviteLink)}>{t("Copy Link")}</Button></div>}
      </section>

      <section className="security-panel">
        <div className="security-toolbar">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Search users")} />
          <Button variant="outline" onClick={() => void load(search)}>{t("Search")}</Button>
        </div>
        {loading ? <p>{t("Loading users...")}</p> : (
          <div className="security-table-wrap"><table className="security-table"><thead><tr><th>{t("User")}</th><th>{t("Status")}</th><th>{t("Roles")}</th><th>{t("Last login")}</th><th>{t("Actions")}</th></tr></thead><tbody>
            {users.map((item) => (
              <tr key={item.membershipId}>
                <td><strong>{item.user.firstName} {item.user.lastName ?? ""}</strong><small>{item.user.email}</small></td>
                <td><select value={item.user.status} onChange={async (event) => { await setUserStatus(item.user.id, event.target.value); await load(search); }}><option value="ACTIVE">{t("Active")}</option><option value="INACTIVE">{t("Inactive")}</option><option value="SUSPENDED">{t("Suspended")}</option></select></td>
                <td><select multiple value={item.roles.map((role) => role.id)} onChange={async (event) => { const roleIds = Array.from(event.target.selectedOptions).map((option) => option.value); await assignUserRoles(item.user.id, roleIds); await load(search); }}>{roles.filter((role) => role.isActive).map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></td>
                <td>{item.user.lastLoginAt ? new Date(item.user.lastLoginAt).toLocaleString() : t("Never")}</td>
                <td><Button variant="outline" size="sm" onClick={async () => { await revokeUserSessions(item.user.id); setMessage(t("Active sessions revoked.")); }}>{t("Revoke Sessions")}</Button></td>
              </tr>
            ))}
          </tbody></table></div>
        )}
      </section>
    </main>
  );
}
