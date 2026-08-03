import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthorization } from "./AuthorizationContext";
import PageLoading from "../components/PageLoading";

export default function SuperAdminRoute({ children }: { children: ReactNode }) {
  const { authorization, loading } = useAuthorization();

  if (loading) return <PageLoading />;
  if (!authorization?.roles.includes("super-administrator")) return <Navigate to="/access-denied" replace />;

  return children;
}
