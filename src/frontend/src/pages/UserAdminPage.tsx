import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthorization } from "../auth/AuthorizationContext";
import Button from "../components/ui/Button";
import { useLocale } from "../i18n/LocaleContext";
import {
  assignUserRoles,
  createInvitation,
  getAdminUsers,
  getRoles,
  revokeUserSessions,
  setUserStatus,
  type AdminUser,
  type RoleRecord,
} from "../services/rbacService";
import "./SecurityAdmin.css";

function apiErrorMessage(error: unknown, fallback: string): string {
  const responseError = error as { response?: { data?: { error?: string } } };
  return responseError.response?.data?.error ?? fallback;
}

function statusLabel(status: string, t: (value: string) => string): string {
  if (status === "ACTIVE") return t("Active");
  if (status === "INACTIVE") return t("Inactive");
  return t("Suspended");
}

function statusClass(status: string): string {
  return status.toLowerCase();
}

export default function UserAdminPage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const { can } = useAuthorization();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const canCreateUsers = can("users.create");
  const canUpdateUsers = can("users.update");
  const canAssignRoles = can("users.assign_roles");
  const canRevokeSessions = can("users.revoke_sessions") || can("users.update");

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

  const activeRoles = useMemo(() => roles.filter((role) => role.isActive), [roles]);

  const effectivePermissions = useMemo(() => {
    const permissionSet = new Set<string>();
    for (const role of activeRoles) {
      if (selectedRoleIds.includes(role.id)) {
        role.permissions.forEach((permission) => permissionSet.add(permission));
      }
    }
    return [...permissionSet].sort();
  }, [activeRoles, selectedRoleIds]);

  const invite = async () => {
    setError("");
    try {
      const result = await createInvitation(email, inviteRole || undefined);
      setInviteLink(`${window.location.origin}${result.invitationPath}`);
      setMessage(t("Invitation created. Copy the secure link below."));
      setEmail("");
    } catch (inviteError) {
      setMessage("");
      setError(apiErrorMessage(inviteError, t("Unable to create invitation.")));
    }
  };

  const changeStatus = async (user: AdminUser, status: string) => {
    setError("");
    setMessage("");
    setUpdatingUserId(user.user.id);
    try {
      await setUserStatus(user.user.id, status);
      setMessage(t("User status updated."));
      await load(search);
    } catch (statusError) {
      setError(apiErrorMessage(statusError, t("Unable to update user status.")));
    } finally {
      setUpdatingUserId(null);
    }
  };

  const revokeSessions = async (user: AdminUser) => {
    setError("");
    setMessage("");
    setUpdatingUserId(user.user.id);
    try {
      await revokeUserSessions(user.user.id);
      setMessage(t("Active sessions revoked."));
    } catch (sessionError) {
      setError(apiErrorMessage(sessionError, t("Unable to revoke active sessions.")));
    } finally {
      setUpdatingUserId(null);
    }
  };

  const openRoleEditor = (user: AdminUser) => {
    setSelectedUser(user);
    setSelectedRoleIds(user.roles.map((role) => role.id));
    setMessage("");
    setError("");
  };

  const closeRoleEditor = () => {
    setSelectedUser(null);
    setSelectedRoleIds([]);
    setError("");
  };

  const saveRoles = async () => {
    if (!selectedUser) return;
    setSavingRoles(true);
    setError("");
    try {
      await assignUserRoles(selectedUser.user.id, selectedRoleIds);
      setMessage(t("Role assignments updated."));
      await load(search);
      closeRoleEditor();
    } catch (assignmentError) {
      setError(apiErrorMessage(assignmentError, t("Unable to update role assignments.")));
    } finally {
      setSavingRoles(false);
    }
  };

  return (
    <main className="admin-page security-admin-page">
      <header className="admin-header compact">
        <div>
          <p className="admin-eyebrow">{t("Administration / Users")}</p>
          <h1>{t("User Management")}</h1>
          <p>{t("Invite users, assign roles, control account status, and revoke active sessions.")}</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/admin")}>{t("Back to Admin")}</Button>
      </header>

      {canCreateUsers && (
        <section className="security-panel">
          <h2>{t("Invite User")}</h2>
          <div className="security-form-row">
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t("Email address")} type="email" />
            <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}>
              <option value="">{t("Select role")}</option>
              {activeRoles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
            </select>
            <Button onClick={() => void invite()} disabled={!email}>{t("Create Invitation")}</Button>
          </div>
          {inviteLink && (
            <div className="invitation-link">
              <input readOnly value={inviteLink} />
              <Button variant="outline" onClick={() => void navigator.clipboard.writeText(inviteLink)}>{t("Copy Link")}</Button>
            </div>
          )}
        </section>
      )}

      {selectedUser && canAssignRoles && (
        <section className="security-panel user-role-editor" aria-labelledby="role-editor-title">
          <div className="security-toolbar role-editor-heading">
            <div>
              <p className="admin-eyebrow">{t("Organization Roles")}</p>
              <h2 id="role-editor-title">{t("Manage Roles")}</h2>
              <p>
                <strong>{selectedUser.user.firstName} {selectedUser.user.lastName ?? ""}</strong>
                <span>{selectedUser.user.email}</span>
              </p>
            </div>
            <Button variant="outline" onClick={closeRoleEditor}>{t("Cancel")}</Button>
          </div>

          <div className="user-role-grid">
            <section className="role-selection-panel">
              <h3>{t("Selected Roles")}</h3>
              <div className="role-checkbox-list">
                {activeRoles.map((role) => (
                  <label key={role.id} className="permission-option role-assignment-option">
                    <input
                      type="checkbox"
                      checked={selectedRoleIds.includes(role.id)}
                      onChange={(event) => setSelectedRoleIds((current) => (
                        event.target.checked
                          ? [...current, role.id]
                          : current.filter((roleId) => roleId !== role.id)
                      ))}
                    />
                    <span>
                      <strong>{role.name}</strong>
                      <small>{role.description ?? t("No description available.")}</small>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section className="effective-permissions-panel">
              <h3>{t("Effective Permissions")}</h3>
              <p>{t("Permissions inherited from the selected roles.")}</p>
              {effectivePermissions.length === 0 ? (
                <p className="empty-state">{t("No roles selected.")}</p>
              ) : (
                <div className="permission-chip-list">
                  {effectivePermissions.map((permission) => <code key={permission}>{permission}</code>)}
                </div>
              )}
            </section>
          </div>

          {error && <p className="form-message error-message">{error}</p>}
          <div className="profile-actions">
            <Button variant="outline" onClick={closeRoleEditor}>{t("Cancel")}</Button>
            <Button onClick={() => void saveRoles()} disabled={savingRoles}>
              {savingRoles ? t("Saving...") : t("Save Roles")}
            </Button>
          </div>
        </section>
      )}

      <section className="security-panel">
        <div className="security-toolbar user-list-toolbar">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Search users")} />
          <Button variant="outline" onClick={() => void load(search)} disabled={loading}>{t("Search")}</Button>
        </div>
        {message && <p className="success-message" role="status">{message}</p>}
        {error && !selectedUser && <p className="form-message error-message" role="alert">{error}</p>}
        {loading ? (
          <div className="admin-loading-state" role="status" aria-live="polite">
            <span className="admin-spinner" aria-hidden="true" />
            <span>{t("Loading users...")}</span>
          </div>
        ) : (
          <div className="security-table-wrap">
            <table className="security-table">
              <thead>
                <tr>
                  <th>{t("User")}</th>
                  <th>{t("Status")}</th>
                  <th>{t("Roles")}</th>
                  <th>{t("Last login")}</th>
                  <th>{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => {
                  const updating = updatingUserId === item.user.id;
                  return (
                    <tr key={item.membershipId} aria-busy={updating}>
                      <td><strong>{item.user.firstName} {item.user.lastName ?? ""}</strong><small>{item.user.email}</small></td>
                      <td>
                        {canUpdateUsers ? (
                          <select value={item.user.status} onChange={(event) => void changeStatus(item, event.target.value)} disabled={updating}>
                            <option value="ACTIVE">{t("Active")}</option>
                            <option value="INACTIVE">{t("Inactive")}</option>
                            <option value="SUSPENDED">{t("Suspended")}</option>
                          </select>
                        ) : (
                          <span className={`status-badge ${statusClass(item.user.status)}`}>{statusLabel(item.user.status, t)}</span>
                        )}
                      </td>
                      <td>
                        <div className="assigned-role-list">
                          {item.roles.length === 0
                            ? <span>{t("No roles assigned")}</span>
                            : item.roles.map((role) => <span key={role.id} className="role-badge">{role.name}</span>)}
                        </div>
                      </td>
                      <td>{item.user.lastLoginAt ? new Date(item.user.lastLoginAt).toLocaleString() : t("Never")}</td>
                      <td>
                        <div className="table-action-group">
                          {canAssignRoles && <Button size="sm" onClick={() => openRoleEditor(item)} disabled={updating}>{t("Manage Roles")}</Button>}
                          {canRevokeSessions && <Button variant="outline" size="sm" onClick={() => void revokeSessions(item)} disabled={updating}>{t("Revoke Sessions")}</Button>}
                          {!canAssignRoles && !canRevokeSessions && <span className="view-only-label">{t("View only")}</span>}
                          {updating && <span className="inline-progress"><span className="admin-spinner small" aria-hidden="true" />{t("Saving...")}</span>}
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
