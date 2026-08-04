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

interface ActiveSession {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastSeenAt: string;
  refreshExpiresAt: string | null;
  current: boolean;
}

interface PrivacyPreferences {
  aggregateAnalyticsEnabled: boolean;
  preciseGpsCollected: boolean;
  approximateLocationMethod: string;
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
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [aggregateAnalyticsEnabled, setAggregateAnalyticsEnabled] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void Promise.all([
      api.get<{ devices: TrustedDevice[] }>("/api/auth/security/devices"),
      api.get<{ sessions: ActiveSession[] }>("/api/auth/security/sessions"),
      api.get<{ preferences: PrivacyPreferences }>("/api/auth/privacy/preferences"),
    ])
      .then(([deviceResponse, sessionResponse, privacyResponse]) => {
        if (!active) return;
        setDevices(deviceResponse.data.devices);
        setSessions(sessionResponse.data.sessions);
        setAggregateAnalyticsEnabled(privacyResponse.data.preferences.aggregateAnalyticsEnabled);
        setError("");
      })
      .catch(() => {
        if (active) setError(t("Unable to load account security information."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [t]);

  const revokeDevice = async (id: string) => {
    await api.delete(`/api/auth/security/devices/${id}`);
    setDevices((current) => current.filter((device) => device.id !== id));
    setMessage(t("Trusted device removed."));
  };

  const revokeSession = async (session: ActiveSession) => {
    if (session.current && !window.confirm(t("End this current session and sign out?"))) return;
    await api.delete(`/api/auth/security/sessions/${session.id}`);
    if (session.current) {
      localStorage.clear();
      window.location.assign("/");
      return;
    }
    setSessions((current) => current.filter((item) => item.id !== session.id));
    setMessage(t("Session ended."));
  };

  const revokeOtherSessions = async () => {
    if (!window.confirm(t("Sign out every other active session?"))) return;
    await api.post("/api/auth/security/sessions/revoke-others");
    setSessions((current) => current.filter((session) => session.current));
    setDevices([]);
    setMessage(t("All other sessions and trusted devices were revoked."));
  };

  const updateAnalyticsPreference = async (enabled: boolean) => {
    setSavingPrivacy(true);
    setError("");
    setMessage("");
    try {
      const response = await api.put<{ preferences: PrivacyPreferences }>("/api/auth/privacy/preferences", {
        aggregateAnalyticsEnabled: enabled,
      });
      setAggregateAnalyticsEnabled(response.data.preferences.aggregateAnalyticsEnabled);
      setMessage(t("Privacy preferences updated."));
    } catch {
      setError(t("Unable to update privacy preferences."));
    } finally {
      setSavingPrivacy(false);
    }
  };

  const resetMfa = async () => {
    if (!window.confirm(t("Reset MFA and revoke all sessions? You will enroll again at the next login."))) return;
    await api.post("/api/auth/security/mfa/reset");
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
            <p>{t("Manage multi-factor authentication, trusted devices, active access, and privacy preferences for your account.")}</p>
          </div>
          <button type="button" className="secondary-button" onClick={() => navigate("/profile")}>{t("Back to Profile")}</button>
        </header>

        {error && <p className="form-message error-message">{error}</p>}
        {message && <p className="form-message success-message">{message}</p>}

        <section className="security-section">
          <div className="security-section-heading">
            <div><h2>{t("Active Sessions")}</h2><p>{t("Browsers and devices currently signed in to your account.")}</p></div>
            <button type="button" className="secondary-button" onClick={() => void revokeOtherSessions()}>{t("Sign Out Other Sessions")}</button>
          </div>
          {loading ? <p>{t("Loading active sessions...")}</p> : sessions.length === 0 ? <p>{t("No active sessions were found.")}</p> : (
            <div className="security-device-list">
              {sessions.map((session) => (
                <article className="security-device" key={session.id}>
                  <div><strong>{deviceLabel(session.userAgent)} {session.current ? `(${t("Current session")})` : ""}</strong><p>{session.ipAddress ?? t("IP address unavailable")}</p><small>{t("Last used")}: {new Date(session.lastSeenAt).toLocaleString()}</small></div>
                  <button type="button" className={session.current ? "danger-button" : "secondary-button"} onClick={() => void revokeSession(session)}>{session.current ? t("Sign Out") : t("End Session")}</button>
                </article>
              ))}
            </div>
          )}
        </section>

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

        <section className="security-section privacy-preferences-section">
          <div className="security-section-heading">
            <div>
              <h2>{t("Privacy & Analytics")}</h2>
              <p>{t("Choose whether your information may contribute to de-identified aggregate product statistics.")}</p>
            </div>
            <span className={`privacy-status-badge ${aggregateAnalyticsEnabled ? "enabled" : "disabled"}`}>
              {aggregateAnalyticsEnabled ? t("Participating") : t("Not participating")}
            </span>
          </div>
          <p className="privacy-detail-note">{t("This optional choice does not affect access to MyFitIdeas. Login security continues to use IP address, device information, and approximate IP-based location. Device GPS is not requested.")}</p>
          <label className="privacy-preference-toggle">
            <input
              type="checkbox"
              checked={aggregateAnalyticsEnabled}
              disabled={loading || savingPrivacy}
              onChange={(event) => void updateAnalyticsPreference(event.target.checked)}
            />
            <span>{savingPrivacy ? t("Saving privacy preference...") : t("Allow de-identified aggregate analytics")}</span>
          </label>
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
