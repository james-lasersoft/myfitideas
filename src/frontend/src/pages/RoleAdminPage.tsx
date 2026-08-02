import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import { useLocale } from "../i18n/LocaleContext";
import { createRole, getPermissions, getRoles, updateRole, type RoleRecord } from "../services/rbacService";
import "./SecurityAdmin.css";

interface PermissionRecord { id: string; key: string; category: string; name: string; description: string | null }

export default function RoleAdminPage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [roleData, permissionData] = await Promise.all([getRoles(), getPermissions()]);
    setRoles(roleData);
    setPermissions(permissionData);
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
  };

  const grouped = useMemo(() => permissions.reduce<Record<string, PermissionRecord[]>>((groups, permission) => {
    groups[permission.category] ??= [];
    groups[permission.category].push(permission);
    return groups;
  }, {}), [permissions]);

  const reset = () => { setSelectedRoleId(""); setName(""); setDescription(""); setSelectedPermissions([]); setMessage(""); };
  const save = async () => {
    if (selectedRole) await updateRole(selectedRole.id, { name, description, permissions: selectedPermissions });
    else await createRole({ name, description, permissions: selectedPermissions });
    setMessage(t("Role saved successfully."));
    setSelectedRoleId("");
    setName("");
    setDescription("");
    setSelectedPermissions([]);
    await load();
  };

  return (
    <main className="admin-page security-admin-page">
      <header className="admin-header compact">
        <div><p className="admin-eyebrow">{t("Administration / Roles")}</p><h1>{t("Role Management")}</h1><p>{t("Create reusable roles and assign permissions by functional area.")}</p></div>
        <Button variant="outline" onClick={() => navigate("/admin")}>{t("Back to Admin")}</Button>
      </header>

      <section className="security-layout">
        <aside className="security-panel role-list">
          <div className="security-toolbar"><h2>{t("Roles")}</h2><Button size="sm" onClick={reset}>{t("New Role")}</Button></div>
          {roles.map((role) => (
            <button key={role.id} type="button" className={`role-list-item${selectedRoleId === role.id ? " active" : ""}`} onClick={() => selectRole(role)}>
              <strong>{role.name}</strong><span>{role.assignedUsers} {t("assigned users")}</span>{role.isProtected && <small>{t("Protected role")}</small>}
            </button>
          ))}
        </aside>

        <section className="security-panel role-editor">
          <h2>{selectedRole ? t("Edit Role") : t("Create Role")}</h2>
          <label>{t("Role name")}<input value={name} onChange={(event) => setName(event.target.value)} disabled={selectedRole?.isProtected} /></label>
          <label>{t("Description")}<textarea value={description} onChange={(event) => setDescription(event.target.value)} disabled={selectedRole?.isProtected} /></label>
          <div className="permission-groups">
            {Object.entries(grouped).map(([category, categoryPermissions]) => (
              <fieldset key={category} disabled={selectedRole?.isProtected}>
                <legend>{category}</legend>
                {categoryPermissions.map((permission) => (
                  <label key={permission.key} className="permission-option"><input type="checkbox" checked={selectedPermissions.includes(permission.key)} onChange={(event) => setSelectedPermissions((current) => event.target.checked ? [...current, permission.key] : current.filter((key) => key !== permission.key))} /><span><strong>{permission.name}</strong><small>{permission.description}</small></span></label>
                ))}
              </fieldset>
            ))}
          </div>
          {message && <p className="success-message">{message}</p>}
          <div className="profile-actions"><Button variant="outline" onClick={reset}>{t("Cancel")}</Button><Button onClick={() => void save()} disabled={!name || selectedRole?.isProtected}>{t("Save Role")}</Button></div>
        </section>
      </section>
    </main>
  );
}
