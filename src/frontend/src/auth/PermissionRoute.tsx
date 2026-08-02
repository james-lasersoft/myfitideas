import type { ReactNode } from "react";
import PageLoading from "../components/PageLoading";
import AccessDeniedPage from "../pages/AccessDeniedPage";
import { useAuthorization } from "./AuthorizationContext";

export default function PermissionRoute({ permission, children }: { permission: string; children: ReactNode }) {
  const { loading, can } = useAuthorization();
  if (loading) return <PageLoading />;
  if (!can(permission)) return <AccessDeniedPage />;
  return children;
}
