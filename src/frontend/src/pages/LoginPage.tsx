import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import api from "../services/api";
import { readWorkspaceSelection, requiresDailyChoice, workspacePath } from "../workspaces/workspace";

interface LoginResponse {
  message: string;
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
    mustChangePassword?: boolean;
  };
  authorization?: {
    organizationId: string | null;
    organizationName: string | null;
    membershipId: string | null;
    roles: string[];
    permissions: string[];
  };
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await api.post<LoginResponse>("/api/auth/login", { email, password });
      localStorage.setItem("authToken", response.data.token);
      localStorage.setItem("currentUser", JSON.stringify(response.data.user));
      if (response.data.authorization) localStorage.setItem("authorization", JSON.stringify(response.data.authorization));

      const hasOrganizationWorkspace = response.data.authorization?.permissions.includes("admin.access") ?? false;
      const remembered = readWorkspaceSelection();
      const destination = requiresDailyChoice(hasOrganizationWorkspace)
        ? "/workspace"
        : workspacePath(hasOrganizationWorkspace && remembered ? remembered.workspace : "personal");

      navigate(destination, { replace: true });
      window.location.reload();
    } catch {
      setError("Login failed. Please verify your email and password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-heading">
        <BrandLogo className="auth-logo" />
        <div className="auth-intro">
          <h1 id="login-heading">Welcome back</h1>
          <p>Continue your body transformation journey.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          {error && <p className="error-message">{error}</p>}
          <button type="submit" disabled={isSubmitting}>{isSubmitting ? "Signing in..." : "Sign In"}</button>
        </form>
      </section>
    </main>
  );
}
