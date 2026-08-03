import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useLocale } from "../i18n/LocaleContext";
import "./SecurityCenter.css";

interface TrustedDevice {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
}

function deviceLabel(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";
  if (userAgent.includes("Edg/")) return "Microsoft Edge";
  if (userAgent.includes("Chrome/")) return "Google Chrome";
  if (userAgent.includes("Firefox/")) return "Mozilla Firefox";
  if (userAgent.includes("Safari/")) return "Safari";
  return userAgent;
}

export default function ProfileSecurityPage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadDevices = async () => {
    try {
      const response = await api.get<{ devices: TrustedDevice[] }>("/api/auth/security/devices");
      setDevices(response.data.devices);
    } catch {
      setError(t("Unable to load trusted devices."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadDevices(); }, []);

  const revokeDevice = async (id: string) => {
    await api.delete(`/api/auth/security/devices/${id}`);
    setDevices((current) => current.filter((device) => device.id !== id));
    setMessage(t("Trusted device removed."));
  };

  const resetMfa = async () => {
    if (!window.confirm(t("Reset MFA and revoke all sessions? You will enroll again at the next login."))) return;
    await api.post("/api/auth/security/reset-mfa");
    localStorage.clear();
    window.location.assign("/");
  };

  return (
    <main className="security-page">
      <section className="security-card">
        <header className="security-header">
          <div>
            <p className="section-eyebrow">{t("Account Security")}</p>
            <h1>{t("Security Center")}</h1>
            <p>{t("Manage multi-factor authentication, trusted devices, and active access to your account.")}</p>
          </div>
          <button type="button" className="secondary-button" onClick={() => navigate("/profile")}>{t("Back to Profile")}</button>
        </header>

        {error && <p className="form-message error-message">{error}</p>}
        {message && <p className="form-message success-message">{message}</p>}

        <section className="security-section">
          <div className="security-section-heading">
            <div><h2>{t("Trusted Devices")}</h2><p>{t("Devices allowed to skip MFA after a successful password check.")}</p></div>
            <span className="security-count">{devices.length}</span>
          </div>
          {loading ? <p>{t("Loading trusted devices...")}</p> : devices.length === 0 ? <p>{t("No trusted devices are currently registered.")}</p> : (
            <div className="security-device-list">
              {devices.map((device) => (
                <article className="security-device" key={device.id}>
                  <div><strong>{deviceLabel(device.userAgent)}</strong><p>{device.ipAddress ?? t("IP address unavailable")}</p><small>{t("Last used")}: {new Date(device.lastSeenAt).toLocaleString()} · {t("Expires")}: {new Date(device.expiresAt).toLocaleDateString()}</small></div>
                  <button type="button" className="secondary-button" onClick={() => void revokeDevice(device.id)}>{t("Remove")}</button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="security-section danger-zone">
          <h2>{t("Multi-factor Authentication")}</h2>
          <p>{t("Resetting MFA removes your authenticator enrollment, recovery codes, trusted devices, and active sessions.")}</p>
          <button type="button" className="danger-button" onClick={() => void resetMfa()}>{t("Reset My MFA")}</button>
        </section>
      </section>
    </main>
  );
}
