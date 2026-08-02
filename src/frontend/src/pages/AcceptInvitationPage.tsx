import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
import Button from "../components/ui/Button";
import BrandLogo from "../components/BrandLogo";
import { useLocale } from "../i18n/LocaleContext";

interface InvitationDetails {
  email: string;
  organization: string;
  role: string | null;
  expiresAt: string;
}

export default function AcceptInvitationPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLocale();
  const token = params.get("token") ?? "";
  const [details, setDetails] = useState<InvitationDetails | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    api.get<InvitationDetails>("/api/v1/invitations", { params: { token } })
      .then((response) => setDetails(response.data))
      .catch(() => setError(t("Invitation is invalid or expired.")));
  }, [token, t]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      await api.post("/api/v1/invitations/accept", { token, firstName, lastName, password });
      setComplete(true);
    } catch {
      setError(t("Unable to accept the invitation."));
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <BrandLogo />
        {complete ? <>
          <h1>{t("Invitation accepted")}</h1>
          <p>{t("Your account is ready. You can now sign in.")}</p>
          <Button onClick={() => navigate("/")}>{t("Go to Sign In")}</Button>
        </> : <>
          <h1>{t("Join MyFitIdeas")}</h1>
          {details && <p>{details.email} · {details.organization}{details.role ? ` · ${details.role}` : ""}</p>}
          {error && <p className="error-message">{error}</p>}
          <form onSubmit={(event) => void submit(event)}>
            <label>{t("First Name")}<input value={firstName} onChange={(event) => setFirstName(event.target.value)} required /></label>
            <label>{t("Last Name")}<input value={lastName} onChange={(event) => setLastName(event.target.value)} /></label>
            <label>{t("Password")}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required /></label>
            <Button type="submit" disabled={!details}>{t("Accept Invitation")}</Button>
          </form>
        </>}
      </section>
    </main>
  );
}
