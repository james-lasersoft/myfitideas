import axios from "axios";
import { QRCodeSVG } from "qrcode.react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { useLocale } from "../i18n/LocaleContext";
import api from "../services/api";
import { readWorkspaceSelection, requiresDailyChoice, workspacePath } from "../workspaces/workspace";
import "./LoginPage.css";

interface LoginResponse {
  message: string;
  token: string;
  accessToken?: string;
  refreshToken?: string;
  user: { id: string; email: string; firstName: string; lastName: string | null; mustChangePassword?: boolean; };
  authorization?: { organizationId: string | null; organizationName: string | null; membershipId: string | null; roles: string[]; permissions: string[]; entitlements: string[]; companyUser: boolean; mfaRequired: boolean; mfaEnabled: boolean; };
}
interface AuthErrorResponse { code?: string; error?: string; enrollmentToken?: string; }
type LoginMode = "credentials" | "mfa" | "enroll" | "recovery";

export default function LoginPage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mode, setMode] = useState<LoginMode>("credentials");
  const [enrollmentToken, setEnrollmentToken] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [otpAuthUri, setOtpAuthUri] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [recoveryConfirmed, setRecoveryConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const finishLogin = (response: LoginResponse) => {
    localStorage.setItem("authToken", response.accessToken ?? response.token);
    if (response.refreshToken) localStorage.setItem("refreshToken", response.refreshToken);
    localStorage.setItem("currentUser", JSON.stringify(response.user));
    if (response.authorization) localStorage.setItem("authorization", JSON.stringify(response.authorization));
    const hasOrganizationWorkspace = response.authorization?.permissions.includes("admin.access") ?? false;
    const remembered = readWorkspaceSelection();
    const destination = requiresDailyChoice(hasOrganizationWorkspace) ? "/workspace" : workspacePath(hasOrganizationWorkspace && remembered ? remembered.workspace : "personal");
    navigate(destination, { replace: true });
    window.location.reload();
  };

  const startEnrollment = async (token: string) => {
    const response = await api.post<{ secret: string; otpAuthUri: string }>("/api/auth/mfa/enroll/start", { enrollmentToken: token });
    setEnrollmentToken(token);
    setMfaSecret(response.data.secret);
    setOtpAuthUri(response.data.otpAuthUri);
    setMfaCode("");
    setMode("enroll");
  };

  const handleCredentialLogin = async () => {
    try {
      const response = await api.post<LoginResponse>("/api/auth/login", { email, password, ...(mfaCode ? { mfaCode } : {}), rememberDevice });
      finishLogin(response.data);
    } catch (caught) {
      if (axios.isAxiosError<AuthErrorResponse>(caught)) {
        const data = caught.response?.data;
        if (data?.code === "MFA_REQUIRED") { setMode("mfa"); setError("Enter the six-digit code from your authenticator app."); return; }
        if (data?.code === "MFA_ENROLLMENT_REQUIRED" && data.enrollmentToken) { await startEnrollment(data.enrollmentToken); return; }
        setError(data?.error ?? "Login failed. Please verify your credentials.");
        return;
      }
      setError("Login failed. Please verify your credentials.");
    }
  };

  const copyRecoveryCodes = async (): Promise<void> => { await navigator.clipboard.writeText(recoveryCodes.join("\n")); };
  const downloadRecoveryCodes = (): void => {
    const blob = new Blob([`MyFitIdeas recovery codes\n\n${recoveryCodes.join("\n")}\n`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "myfitideas-recovery-codes.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      if (mode === "enroll") {
        const response = await api.post<{ recoveryCodes: string[] }>("/api/auth/mfa/enroll/complete", { enrollmentToken, code: mfaCode, rememberDevice });
        setRecoveryCodes(response.data.recoveryCodes);
        setMfaCode("");
        setMode("recovery");
      } else if (mode === "recovery") {
        if (!recoveryConfirmed) { setError("Confirm that you stored the recovery codes before continuing."); return; }
        setMode("mfa");
      } else {
        await handleCredentialLogin();
      }
    } finally { setIsSubmitting(false); }
  };

  const step = mode === "enroll" ? 1 : mode === "mfa" ? 2 : mode === "recovery" ? 3 : null;

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-heading">
        <BrandLogo className="auth-logo" />
        {step && <p className="mfa-step">{t("Step")} {step} {t("of 3")}</p>}
        <div className="auth-intro">
          <h1 id="login-heading">{mode === "enroll" ? "Secure your company account" : mode === "recovery" ? "Save your recovery codes" : "Welcome back"}</h1>
          <p>{mode === "enroll" ? "Scan the QR code with your authenticator app, then enter the six-digit code." : mode === "recovery" ? "Store these one-time codes in a safe place." : "Continue your body transformation journey."}</p>
        </div>
        <form onSubmit={handleSubmit}>
          {(mode === "credentials" || mode === "mfa") && <>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={mode === "mfa"} />
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={mode === "mfa"} />
          </>}

          {mode === "enroll" && <div className="mfa-enrollment-details">
            {otpAuthUri && <div className="mfa-qr-code" role="img" aria-label="Authenticator QR code"><QRCodeSVG value={otpAuthUri} size={220} level="M" marginSize={2} bgColor="#ffffff" fgColor="#1f2937" /></div>}
            <p>Unable to scan? Enter this setup key manually:</p>
            <code className="mfa-setup-key" data-no-translate="true">{mfaSecret}</code>
            <details className="mfa-uri-details"><summary>Show authenticator setup URI</summary><code data-no-translate="true">{otpAuthUri}</code></details>
          </div>}

          {(mode === "mfa" || mode === "enroll") && <>
            <label htmlFor="mfa-code">Authentication Code</label>
            <input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9A-Fa-f]{6,10}" value={mfaCode} onChange={(event) => setMfaCode(event.target.value)} required />
            <label className="remember-device-option"><input type="checkbox" checked={rememberDevice} onChange={(event) => setRememberDevice(event.target.checked)} /><span>Trust this device for 30 days</span></label>
          </>}

          {mode === "recovery" && <>
            <div className="mfa-recovery-codes">{recoveryCodes.map((code) => <code key={code} data-no-translate="true">{code}</code>)}</div>
            <div className="recovery-actions">
              <button type="button" className="secondary-button" onClick={() => void copyRecoveryCodes()}>Copy</button>
              <button type="button" className="secondary-button" onClick={downloadRecoveryCodes}>Download</button>
              <button type="button" className="secondary-button" onClick={() => window.print()}>Print</button>
            </div>
            <label className="remember-device-option"><input type="checkbox" checked={recoveryConfirmed} onChange={(event) => setRecoveryConfirmed(event.target.checked)} /><span>I have stored these recovery codes safely</span></label>
          </>}

          {error && <p className="error-message">{error}</p>}
          <button type="submit" disabled={isSubmitting || (mode === "recovery" && !recoveryConfirmed)}>{isSubmitting ? "Working..." : mode === "enroll" ? "Verify and enable MFA" : mode === "recovery" ? "Finish setup" : mode === "mfa" ? "Verify and Sign In" : "Sign In"}</button>
          {mode === "mfa" && <button type="button" className="secondary-button" onClick={() => { setMode("credentials"); setMfaCode(""); setError(""); }}>Use a different account</button>}
        </form>
      </section>
    </main>
  );
}
