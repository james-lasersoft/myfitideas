import axios from "axios";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLocale } from "../i18n/LocaleContext";
import api from "../services/api";
import "./LoginPage.css";
import "./RegistrationPage.css";

interface RegistrationError { error?: string }
interface AvailabilityResponse { available: boolean }
interface RegistrationResponse {
  verificationRequired: boolean;
  user: { email: string; firstName: string; status: string };
}

type AvailabilityState = "idle" | "checking" | "available" | "unavailable" | "invalid";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COUNTRIES = [
  ["US", "United States"],
  ["BR", "Brazil"],
  ["CA", "Canada"],
  ["GB", "United Kingdom"],
  ["PT", "Portugal"],
  ["MX", "Mexico"],
] as const;

function detectTimezone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; }
  catch { return "UTC"; }
}

export default function RegistrationPage() {
  const navigate = useNavigate();
  const { locale, setLocale, t } = useLocale();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [countryCode, setCountryCode] = useState(locale === "pt-BR" ? "BR" : "US");
  const [preferredLanguage, setPreferredLanguage] = useState(locale);
  const [timezone, setTimezone] = useState(detectTimezone);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [aggregateAnalyticsEnabled, setAggregateAnalyticsEnabled] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityState>("idle");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const passwordChecks = useMemo(() => ({
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    match: confirmPassword.length > 0 && password === confirmPassword,
  }), [password, confirmPassword]);

  const passwordReady = Object.values(passwordChecks).every(Boolean);
  const identityReady = firstName.trim().length > 0 && EMAIL_PATTERN.test(email.trim());
  const localizationReady = countryCode.length === 2 && preferredLanguage.length > 0 && timezone.length > 0;
  const canCreateAccount = identityReady && availability === "available" && passwordReady
    && localizationReady && termsAccepted && privacyAcknowledged && !submitting;

  useEffect(() => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) { setAvailability("idle"); return; }
    if (!EMAIL_PATTERN.test(normalized)) { setAvailability("invalid"); return; }
    setAvailability("checking");
    const timer = window.setTimeout(() => {
      void api.post<AvailabilityResponse>("/api/auth/email-availability", { email: normalized })
        .then((response) => setAvailability(response.data.available ? "available" : "unavailable"))
        .catch(() => setAvailability("idle"));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [email]);

  const changeCountry = (nextCountry: string) => {
    setCountryCode(nextCountry);
    if (nextCountry === "BR" || nextCountry === "PT") {
      setPreferredLanguage("pt-BR");
      setLocale("pt-BR");
    } else if (preferredLanguage !== "en-US") {
      setPreferredLanguage("en-US");
      setLocale("en-US");
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!canCreateAccount) return;

    setSubmitting(true);
    try {
      const response = await api.post<RegistrationResponse>("/api/auth/register", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        countryCode,
        preferredLanguage,
        timezone,
        termsAccepted,
        privacyAcknowledged,
        aggregateAnalyticsEnabled,
      });
      navigate(`/verify-email?email=${encodeURIComponent(response.data.user.email)}`, { replace: true });
    } catch (caught) {
      if (axios.isAxiosError<RegistrationError>(caught)) setError(caught.response?.data?.error ?? t("Unable to create your account."));
      else setError(t("Unable to create your account."));
    } finally {
      setSubmitting(false);
    }
  };

  const requirement = (met: boolean, text: string) => (
    <li className={met ? "met" : "pending"}><span aria-hidden="true">{met ? "✓" : "○"}</span>{t(text)}</li>
  );

  return (
    <main className="signup-experience">
      <section className="signup-intro-panel">
        <p className="public-kicker">{t("Identity first. Health data later.")}</p>
        <h1>{t("Create your MyFitIdeas account")}</h1>
        <p>{t("Set up your secure account and preferences now. Measurements, goals, and health details are collected later through guided onboarding.")}</p>
        <div className="signup-trust-list">
          <span>✓ {t("No payment required")}</span>
          <span>✓ {t("No health data during signup")}</span>
          <span>✓ {t("Privacy choices stay under your control")}</span>
        </div>
      </section>

      <section className="signup-card" aria-labelledby="registration-heading">
        <div className="signup-card-heading">
          <h2 id="registration-heading">{t("Create Account")}</h2>
          <p>{t("Already have an account?")} <Link to="/login">{t("Log In")}</Link></p>
        </div>

        <div className="identity-provider-preview" aria-label={t("Identity provider options")}> 
          {["Google", "Apple", "Microsoft"].map((provider) => (
            <button key={provider} type="button" disabled data-no-translate="true">{provider}<small>{t("Coming soon")}</small></button>
          ))}
        </div>
        <div className="signup-divider"><span>{t("or create an account with email")}</span></div>

        <form onSubmit={submit} noValidate>
          <div className="registration-name-grid">
            <label>{t("First Name")}<input value={firstName} onChange={(event) => setFirstName(event.target.value)} autoComplete="given-name" required /></label>
            <label>{t("Last Name")}<input value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="family-name" /></label>
          </div>

          <label>{t("Email Address")}
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required aria-describedby="email-status" />
            <small id="email-status" className={`field-status ${availability}`} aria-live="polite">
              {availability === "checking" && t("Checking email availability...")}
              {availability === "available" && t("Email is available")}
              {availability === "unavailable" && <>{t("This email already has an account.")} <Link to="/login">{t("Log In")}</Link></>}
              {availability === "invalid" && t("Enter a valid email address")}
            </small>
          </label>

          <div className="registration-name-grid">
            <label>{t("Create Password")}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" aria-describedby="password-requirements" required /></label>
            <label>{t("Confirm Password")}<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" aria-describedby="password-requirements" required /></label>
          </div>

          <div id="password-requirements" className="password-requirements" aria-live="polite">
            <p>{t("Password requirements")}</p>
            <ul>
              {requirement(passwordChecks.length, "At least 8 characters")}
              {requirement(passwordChecks.upper, "One uppercase letter")}
              {requirement(passwordChecks.lower, "One lowercase letter")}
              {requirement(passwordChecks.number, "One number")}
              {requirement(passwordChecks.special, "One special character")}
              {requirement(passwordChecks.match, "Both password fields match")}
            </ul>
          </div>

          <fieldset className="signup-preferences">
            <legend>{t("Location and language")}</legend>
            <div className="signup-preference-grid">
              <label>{t("Country")}
                <select value={countryCode} onChange={(event) => changeCountry(event.target.value)}>
                  {COUNTRIES.map(([code, name]) => <option key={code} value={code}>{t(name)}</option>)}
                </select>
              </label>
              <label>{t("Language")}
                <select value={preferredLanguage} onChange={(event) => { const next = event.target.value as "en-US" | "pt-BR"; setPreferredLanguage(next); setLocale(next); }}>
                  <option value="en-US">English</option>
                  <option value="pt-BR">Português (Brasil)</option>
                </select>
              </label>
              <label>{t("Timezone")}<input value={timezone} onChange={(event) => setTimezone(event.target.value)} autoComplete="off" /></label>
            </div>
          </fieldset>

          <div className="signup-consents">
            <label className="registration-consent required-consent"><input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} /><span>{t("I agree to the")} <Link to="/terms" target="_blank">{t("Terms of Service")}</Link>.</span></label>
            <label className="registration-consent required-consent"><input type="checkbox" checked={privacyAcknowledged} onChange={(event) => setPrivacyAcknowledged(event.target.checked)} /><span>{t("I have read and acknowledge the")} <Link to="/privacy" target="_blank">{t("Privacy Notice")}</Link>.</span></label>
            <label className="registration-consent optional-consent"><input type="checkbox" checked={aggregateAnalyticsEnabled} onChange={(event) => setAggregateAnalyticsEnabled(event.target.checked)} /><span><strong>{t("Allow de-identified aggregate analytics")}</strong><small>{t("Optional. This can be changed later without affecting your access.")}</small></span></label>
          </div>

          {error && <p className="error-message" role="alert">{error}</p>}
          <button className="signup-submit" type="submit" disabled={!canCreateAccount}>{submitting ? t("Creating your secure account...") : t("Create Account")}</button>
        </form>
      </section>
    </main>
  );
}
