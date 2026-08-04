import axios from "axios";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { useLocale } from "../i18n/LocaleContext";
import api from "../services/api";
import { readWorkspaceSelection, requiresDailyChoice, workspacePath } from "../workspaces/workspace";
import "./LoginPage.css";
import "./RegistrationPage.css";

interface RegistrationError { error?: string }

interface LoginResponse {
  message: string;
  token: string;
  accessToken?: string;
  refreshToken?: string;
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
    entitlements: string[];
    companyUser: boolean;
    mfaRequired: boolean;
    mfaEnabled: boolean;
  };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegistrationPage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [aggregateAnalyticsEnabled, setAggregateAnalyticsEnabled] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const passwordLongEnough = password.length >= 8;
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const requiredIdentityComplete = firstName.trim().length > 0 && EMAIL_PATTERN.test(email.trim());
  const canCreateAccount = requiredIdentityComplete && passwordLongEnough && passwordsMatch && privacyAcknowledged && !submitting;

  const completeLogin = (response: LoginResponse) => {
    localStorage.setItem("authToken", response.accessToken ?? response.token);
    if (response.refreshToken) localStorage.setItem("refreshToken", response.refreshToken);
    localStorage.setItem("currentUser", JSON.stringify(response.user));
    if (response.authorization) localStorage.setItem("authorization", JSON.stringify(response.authorization));

    const hasOrganizationWorkspace = response.authorization?.permissions.includes("admin.access") ?? false;
    const remembered = readWorkspaceSelection();
    const destination = requiresDailyChoice(hasOrganizationWorkspace)
      ? "/workspace"
      : workspacePath(hasOrganizationWorkspace && remembered ? remembered.workspace : "personal");

    navigate(destination, { replace: true });
    window.location.reload();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!canCreateAccount) return;

    setSubmitting(true);
    try {
      await api.post("/api/auth/register", {
        firstName,
        lastName,
        email,
        password,
        privacyAcknowledged,
        aggregateAnalyticsEnabled,
      });

      const loginResponse = await api.post<LoginResponse>("/api/auth/login", { email, password });
      completeLogin(loginResponse.data);
    } catch (caught) {
      if (axios.isAxiosError<RegistrationError>(caught)) {
        setError(caught.response?.data?.error ?? t("Unable to create your account."));
      } else {
        setError(t("Unable to create your account."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page registration-page">
      <section className="auth-card registration-card" aria-labelledby="registration-heading">
        <BrandLogo className="auth-logo" />
        <div className="auth-intro">
          <h1 id="registration-heading">{t("Create your MyFitIdeas account")}</h1>
          <p>{t("Start tracking your health and transformation journey.")}</p>
        </div>

        <form onSubmit={submit}>
          <div className="registration-name-grid">
            <label>{t("First Name")}<input value={firstName} onChange={(event) => setFirstName(event.target.value)} autoComplete="given-name" required /></label>
            <label>{t("Last Name")}<input value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="family-name" /></label>
          </div>
          <label>{t("Email")}<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
          <label>{t("Create Password")}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} aria-describedby="password-requirements" required /></label>
          <label>{t("Confirm Password")}<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} aria-describedby="password-requirements" required /></label>

          <div id="password-requirements" className="password-requirements" aria-live="polite">
            <p>{t("Password requirements")}</p>
            <ul>
              <li className={passwordLongEnough ? "met" : "pending"}>{passwordLongEnough ? "✓" : "○"} {t("At least 8 characters")}</li>
              <li className={passwordsMatch ? "met" : "pending"}>{passwordsMatch ? "✓" : "○"} {t("Both password fields match")}</li>
            </ul>
          </div>

          <details className="privacy-summary">
            <summary>{t("Privacy and account security notice")}</summary>
            <p>{t("MyFitIdeas records login time, IP address, browser and device information, and approximate location derived from the IP address to protect your account, identify suspicious access, and let you review or end sessions.")}</p>
            <p>{t("MyFitIdeas does not request or use your device GPS location for login security.")}</p>
          </details>

          <label className="registration-consent required-consent">
            <input type="checkbox" checked={privacyAcknowledged} onChange={(event) => setPrivacyAcknowledged(event.target.checked)} required />
            <span>{t("I agree to the Terms and acknowledge the Privacy Notice, including the security logging described above.")}</span>
          </label>

          <label className="registration-consent optional-consent">
            <input type="checkbox" checked={aggregateAnalyticsEnabled} onChange={(event) => setAggregateAnalyticsEnabled(event.target.checked)} />
            <span>{t("Allow my data to contribute to de-identified aggregate product statistics. This is optional and can be changed later.")}</span>
          </label>

          <p className="privacy-choice-note">{t("Declining aggregate analytics does not affect your ability to use MyFitIdeas.")}</p>
          {error && <p className="error-message" role="alert">{error}</p>}
          <button type="submit" disabled={!canCreateAccount}>{submitting ? t("Creating account...") : t("Create Account")}</button>
          <button type="button" className="secondary-button" onClick={() => navigate("/")}>{t("Back to Sign In")}</button>
        </form>
      </section>
    </main>
  );
}
