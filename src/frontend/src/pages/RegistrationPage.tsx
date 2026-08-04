import axios from "axios";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { useLocale } from "../i18n/LocaleContext";
import api from "../services/api";
import "./LoginPage.css";
import "./RegistrationPage.css";

interface RegistrationError { error?: string }

export default function RegistrationPage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [aggregateAnalyticsEnabled, setAggregateAnalyticsEnabled] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
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
      navigate("/", { replace: true, state: { registrationComplete: true } });
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
          <label>{t("Password")}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required /></label>

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
          <button type="submit" disabled={submitting || !privacyAcknowledged}>{submitting ? t("Creating account...") : t("Create Account")}</button>
          <button type="button" className="secondary-button" onClick={() => navigate("/")}>{t("Back to Sign In")}</button>
        </form>
      </section>
    </main>
  );
}
