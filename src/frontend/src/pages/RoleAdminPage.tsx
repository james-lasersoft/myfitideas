import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthorization } from "../auth/AuthorizationContext";
import Button from "../components/ui/Button";
import { useLocale } from "../i18n/LocaleContext";
import { createRole, deleteRole, getPermissions, getRoles, updateRole, type RoleRecord } from "../services/rbacService";
import "./SecurityAdmin.css";

interface PermissionRecord { id: string; key: string; category: string; name: string; description: string | null }

function apiErrorMessage(error: unknown, fallback: string): string {
  const responseError = error as { response?: { data?: { error?: string } } };
  return responseError.response?.data?.error ?? fallback;
}

export default function RoleAdminPage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const { can } = useAuthorization();
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<RoleRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canCreateRoles = can("roles.create");
  const canUpdateRoles = can("roles.update");
  const canDeleteRoles = can("roles.delete");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [roleData, permissionData] = await Promise.all([getRoles(), getPermissions()]);
      setRoles(roleData);
      setPermissions(permissionData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const selectedRole = roles.find((role) => role.id === selectedRoleId);
  const selectRole = (role: RoleRecord) => {
    setSelectedRoleId(role.id);
    setName(role.name);
    setDescription(role.description ?? "");
    setSelectedPermissions(role.permissions);
    setMessage("");
    setError("");
    setDeleteCandidate(null);
  };

  const grouped = useMemo(() => permissions.reduce<Record<string, PermissionRecord[]>>((groups, permission) => {
    groups[permission.category] ??= [];
    groups[permission.category].push(permission);
    return groups;
  }, {}), [permissions]);

  const clearEditor = () => {
    setSelectedRoleId("");
    setName("");
    setDescription("");
    setSelectedPermissions([]);
    setDeleteCandidate(null);
  };

  const reset = () => {
    clearEditor();
    setMessage("");
    setError("");
  };

  const save = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      if (selectedRole) await updateRole(selectedRole.id, { name, description, permissions: selectedPermissions });
      else await createRole({ name, description, permissions: selectedPermissions });
      clearEditor();
      setMessage(t("Role saved successfully."));
      await load();
    } catch (saveError) {
      setError(apiErrorMessage(saveError, t("Unable to save role.")));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteCandidate) return;
    setDeleting(true);
    setMessage("");
    setError("");
    try {
      await deleteRole(deleteCandidate.id);
      clearEditor();
      setMessage(t("Role deleted successfully."));
      await load();
    } catch (deleteError) {
      setError(apiErrorMessage(deleteError, t("Unable to delete role.")));
    } finally {
      setDeleting(false);
    }
  };

  const selectedRoleEditable = !selectedRole?.isProtected && canUpdateRoles;
  const selectedRoleDeletable = Boolean(selectedRole && canDeleteRoles && !selectedRole.isProtected && !selectedRole.isSystem);

  return (
    <main className="admin-page security-admin-page">
      <header className="admin-header compact">
        <div><p className="admin-eyebrow">{t("Administration / Roles")}</p><h1>{t("Role Management")}</h1><p>{t("Create reusable roles and assign permissions by functional area.")}</p></div>
        <Button variant="outline" onClick={() => navigate("/admin")}>{t("Back to Admin")}</Button>
      </header>

      {deleteCandidate && (
        <section className="security-panel deletion-confirmation" role="alertdialog" aria-modal="true" aria-labelledby="delete-role-title" aria-describedby="delete-role-description">
          <div>
            <p className="admin-eyebrow">{t("Confirm role deletion")}</p>
            <h2 id="delete-role-title">{t("Delete Role")}: {deleteCandidate.name}</h2>
            <p id="delete-role-description">{t("This action permanently deletes the custom role. Assigned users and pending invitations must be removed first.")}</p>
            {error && <p className="form-message error-message" role="alert">{error}</p>}
          </div>
          <div className="profile-actions">
            <Button variant="outline" onClick={() => { setDeleteCandidate(null); setError(""); }} disabled={deleting}>{t("Cancel")}</Button>
            <Button onClick={() => void confirmDelete()} disabled={deleting}>{deleting ? t("Deleting...") : t("Confirm Delete")}</Button>
          </div>
        </section>
      )}

      <section className="security-layout">
        <aside className="security-panel role-list">
          <div className="security-toolbar"><h2>{t("Roles")}</h2>{canCreateRoles && <Button size="sm" onClick={reset}>{t("New Role")}</Button>}</div>
          {loading ? (
            <div className="admin-loading-state" role="status"><span className="admin-spinner" aria-hidden="true" /><span>{t("Loading roles...")}</span></div>
          ) : roles.map((role) => (
            <button key={role.id} type="button" className={`role-list-item${selectedRoleId === role.id ? " active" : ""}`} onClick={() => selectRole(role)}>
              <span className="role-list-heading"><strong>{role.name}</strong>{role.isProtected && <span className="role-type-badge protected">{t("Protected")}</span>}</span>
              <span>{role.assignedUsers} {t("assigned users")}</span>
              <small>{role.permissions.length} {t("permissions")}</small>
            </button>
          ))}
        </aside>

        <section className="security-panel role-editor">
          <div className="security-toolbar role-editor-toolbar">
            <div><h2>{selectedRole ? t("Edit Role") : t("Create Role")}</h2>{selectedRole?.isProtected && <p className="protected-role-note">{t("Protected roles are read only.")}</p>}</div>
            {selectedRoleDeletable && <Button variant="outline" onClick={() => { setError(""); setDeleteCandidate(selectedRole!); }}>{t("Delete Role")}</Button>}
          </div>
          <label>{t("Role name")}<input value={name} onChange={(event) => setName(event.target.value)} disabled={Boolean(selectedRole) ? !selectedRoleEditable : !canCreateRoles} /></label>
          <label>{t("Description")}<textarea value={description} onChange={(event) => setDescription(event.target.value)} disabled={Boolean(selectedRole) ? !selectedRoleEditable : !canCreateRoles} /></label>
          <div className="permission-groups">
            {Object.entries(grouped).map(([category, categoryPermissions]) => (
              <fieldset key={category} disabled={Boolean(selectedRole) ? !selectedRoleEditable : !canCreateRoles}>
                <legend>{category}</legend>
                {categoryPermissions.map((permission) => (
                  <label key={permission.key} className="permission-option"><input type="checkbox" checked={selectedPermissions.includes(permission.key)} onChange={(event) => setSelectedPermissions((current) => event.target.checked ? [...current, permission.key] : current.filter((key) => key !== permission.key))} /><span><strong>{permission.name}</strong><small>{permission.description}</small></span></label>
                ))}
              </fieldset>
            ))}
          </div>
          {message && <p className="success-message" role="status">{message}</p>}
          {error && !deleteCandidate && <p className="form-message error-message" role="alert">{error}</p>}
          <div className="profile-actions">
            <Button variant="outline" onClick={reset}>{t("Cancel")}</Button>
            <Button onClick={() => void save()} disabled={!name || saving || (Boolean(selectedRole) ? !selectedRoleEditable : !canCreateRoles)}>{saving ? t("Saving...") : t("Save Role")}</Button>
          </div>
        </section>
      </section>
    </main>
  );
}
