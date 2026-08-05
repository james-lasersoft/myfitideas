import api from "./api";

export interface AuthorizationSnapshot {
  organizationId: string | null;
  organizationName: string | null;
  membershipId: string | null;
  roles: string[];
  permissions: string[];
  entitlements: string[];
  companyUser: boolean;
  mfaRequired: boolean;
  mfaEnabled: boolean;
}

export interface RoleRecord {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isProtected: boolean;
  isActive: boolean;
  assignedUsers: number;
  permissions: string[];
}

export interface AdminUser {
  membershipId: string;
  membershipStatus: string;
  joinedAt: string;
  user: { id: string; email: string; firstName: string; lastName: string | null; status: string; lastLoginAt: string | null; mustChangePassword: boolean };
  roles: Array<{ id: string; key: string; name: string }>;
}

export async function getMyAuthorization() {
  const response = await api.get("/api/v1/admin/rbac/me");
  return response.data as { user: Record<string, unknown> | null; authorization: AuthorizationSnapshot };
}

export async function getAdminUsers(search = "", page = 1) {
  const response = await api.get("/api/v1/admin/rbac/users", { params: { search, page } });
  return response.data as { items: AdminUser[]; pagination: { page: number; pageSize: number; total: number; pageCount: number } };
}

export async function setUserStatus(userId: string, status: string): Promise<void> {
  await api.patch(`/api/v1/admin/rbac/users/${userId}/status`, { status });
}

export async function assignUserRoles(userId: string, roleIds: string[]): Promise<void> {
  await api.put(`/api/v1/admin/rbac/users/${userId}/roles`, { roleIds });
}

export async function revokeUserSessions(userId: string): Promise<void> {
  await api.post(`/api/v1/admin/rbac/users/${userId}/revoke-sessions`);
}

export async function getRoles(): Promise<RoleRecord[]> {
  const response = await api.get<RoleRecord[]>("/api/v1/admin/rbac/roles");
  return response.data;
}

export async function getPermissions() {
  const response = await api.get("/api/v1/admin/rbac/permissions");
  return response.data as Array<{ id: string; key: string; category: string; name: string; description: string | null }>;
}

export async function createRole(input: { name: string; description?: string; permissions: string[] }): Promise<RoleRecord> {
  const response = await api.post<RoleRecord>("/api/v1/admin/rbac/roles", input);
  return response.data;
}

export async function updateRole(roleId: string, input: { name?: string; description?: string; isActive?: boolean; permissions: string[] }): Promise<RoleRecord> {
  const response = await api.put<RoleRecord>(`/api/v1/admin/rbac/roles/${roleId}`, input);
  return response.data;
}

export async function deleteRole(roleId: string): Promise<void> {
  await api.delete(`/api/v1/admin/rbac/roles/${roleId}`);
}

export async function createInvitation(email: string, roleId?: string) {
  const response = await api.post("/api/v1/admin/rbac/invitations", { email, roleId });
  return response.data as { token: string; invitationPath: string };
}

export async function getAuditLogs(page = 1) {
  const response = await api.get("/api/v1/admin/rbac/audit", { params: { page } });
  return response.data;
}
