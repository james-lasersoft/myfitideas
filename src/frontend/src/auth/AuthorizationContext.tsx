import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getMyAuthorization, type AuthorizationSnapshot } from "../services/rbacService";

interface AuthorizationContextValue {
  authorization: AuthorizationSnapshot | null;
  loading: boolean;
  can: (permission: string) => boolean;
  refresh: () => Promise<void>;
}

const AuthorizationContext = createContext<AuthorizationContextValue | null>(null);

export function AuthorizationProvider({ children }: { children: ReactNode }) {
  const [authorization, setAuthorization] = useState<AuthorizationSnapshot | null>(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("authToken")));

  const refresh = useCallback(async () => {
    if (!localStorage.getItem("authToken")) {
      setAuthorization(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await getMyAuthorization();
      setAuthorization(result.authorization);
      localStorage.setItem("authorization", JSON.stringify(result.authorization));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cached = localStorage.getItem("authorization");
    if (cached) {
      try { setAuthorization(JSON.parse(cached) as AuthorizationSnapshot); } catch { localStorage.removeItem("authorization"); }
    }
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthorizationContextValue>(() => ({
    authorization,
    loading,
    can: (permission) => authorization?.permissions.includes(permission) ?? false,
    refresh,
  }), [authorization, loading, refresh]);

  return <AuthorizationContext.Provider value={value}>{children}</AuthorizationContext.Provider>;
}

export function useAuthorization(): AuthorizationContextValue {
  const context = useContext(AuthorizationContext);
  if (!context) throw new Error("useAuthorization must be used inside AuthorizationProvider.");
  return context;
}

export function Can({ permission, children }: { permission: string; children: ReactNode }) {
  const { can } = useAuthorization();
  return can(permission) ? children : null;
}
