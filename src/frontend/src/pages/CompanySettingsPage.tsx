import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminBadge, AdminLoadingState, AdminPageHeader } from "../components/admin/AdminComponents";
import { useLocale } from "../i18n/LocaleContext";
import api from "../services/api";
import "./Admin.css";
import "./AdminConsoleTheme.css";
import "./CompanySettingsPage.css";

type Provider = "disabled" | "ipinfo" | "custom";

interface GeolocationSettings {
  enabled: boolean;
  provider: Provider;
  credentialEnvironmentVariable: string;
  lookupOnNewLoginOnly: boolean;
  retainApproximateCoordinates: boolean;
  displayCityRegionCountry: boolean;
  testMode: boolean;
}

interface SettingsResponse {
  settings: GeolocationSettings;
  capabilities: {
    supportedProviders: Provider[];
    credentialConfigured: boolean;
    secretsStoredInDatabase: boolean;
    preciseGpsCollected: boolean;
  };
}

export default function CompanySettingsPage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [settings, setSettings] = useState<GeolocationSettings | null>(null);
  const [credentialConfigured, setCredentialConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void api.get<SettingsResponse>("/api/v1/admin/settings/geolocation")
      .then((response) => {
        setSettings(response.data.settings);
        setCredentialConfigured(response.data.capabilities.credentialConfigured);
      })
      .catch(() => setError(t("Unable to load company settings.")))
      .finally(() => setLoading(false));
  }, [t]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await api.put<SettingsResponse>("/api/v1/admin/settings/geolocation", settings);
      setSettings(response.data.settings);
      setCredentialConfigured(response.data.capabilities.credentialConfigured);
      setMessage(t("Company settings updated."));
    } catch {
      setError(t("Unable to update company settings."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="admin-page admin-console-page company-settings-page">
      <AdminPageHeader
        eyebrow={t("Organization Controls")}
        title={t("Company Settings")}
        description={t("Configure provider-neutral services and security policies without storing provider secrets in MyFitIdeas.")}
        backLabel={t("Back to Admin Center")}
        onBack={() => navigate("/admin")}
      />

      {loading || !settings ? <AdminLoadingState label={t("Loading company settings...")} /> : (
        <section className="company-settings-card">
          {error && <p className="form-message error-message" role="alert">{error}</p>}
          {message && <p className="form-message success-message" role="status">{message}</p>}

          <div className="settings-section-heading">
            <div>
              <h2>{t("IP Geolocation Provider")}</h2>
              <p>{t("Approximate login location is derived from the public IP address only. Device GPS is never requested.")}</p>
            </div>
            <AdminBadge tone={settings.testMode ? "warning" : settings.enabled ? "success" : "neutral"} dot>
              {settings.testMode ? t("Test data mode") : settings.enabled ? t("Enabled") : t("Disabled")}
            </AdminBadge>
          </div>

          <div className="company-settings-grid">
            <label>
              {t("Provider")}
              <select value={settings.provider} onChange={(event) => setSettings({ ...settings, provider: event.target.value as Provider })}>
                <option value="disabled">{t("Disabled")}</option>
                <option value="ipinfo">IPinfo</option>
                <option value="custom">{t("Custom provider")}</option>
              </select>
            </label>

            <label>
              {t("Credential environment variable")}
              <input
                value={settings.credentialEnvironmentVariable}
                onChange={(event) => setSettings({ ...settings, credentialEnvironmentVariable: event.target.value.toUpperCase() })}
                placeholder="IPINFO_TOKEN"
                autoComplete="off"
              />
              <small>{t("Store the secret in the deployment environment. Only its variable name is saved here.")}</small>
            </label>
          </div>

          <div className="credential-status-row">
            <span>{t("Credential status")}</span>
            <AdminBadge tone={credentialConfigured ? "success" : "neutral"} dot>
              {credentialConfigured ? t("Configured in environment") : t("Not configured")}
            </AdminBadge>
          </div>

          <div className="settings-toggle-list">
            <label><input type="checkbox" checked={settings.enabled} onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })} /><span><strong>{t("Enable provider lookups")}</strong><small>{t("Keep disabled while using seeded test locations.")}</small></span></label>
            <label><input type="checkbox" checked={settings.lookupOnNewLoginOnly} onChange={(event) => setSettings({ ...settings, lookupOnNewLoginOnly: event.target.checked })} /><span><strong>{t("Lookup only when a new login session is created")}</strong><small>{t("Persist the result and avoid repeated provider requests.")}</small></span></label>
            <label><input type="checkbox" checked={settings.displayCityRegionCountry} onChange={(event) => setSettings({ ...settings, displayCityRegionCountry: event.target.checked })} /><span><strong>{t("Display city, region, and country")}</strong><small>{t("Show an approximate location in member and administrator security views.")}</small></span></label>
            <label><input type="checkbox" checked={settings.retainApproximateCoordinates} onChange={(event) => setSettings({ ...settings, retainApproximateCoordinates: event.target.checked })} /><span><strong>{t("Retain approximate coordinates")}</strong><small>{t("Disabled by default to minimize stored location data.")}</small></span></label>
            <label><input type="checkbox" checked={settings.testMode} onChange={(event) => setSettings({ ...settings, testMode: event.target.checked })} /><span><strong>{t("Use seeded test location data")}</strong><small>{t("Allows interface testing without a paid provider account.")}</small></span></label>
          </div>

          <div className="settings-security-note">
            <strong>{t("Secret handling")}</strong>
            <p>{t("Provider tokens are never stored in the database, audit logs, browser, or source repository.")}</p>
          </div>

          <div className="settings-actions">
            <button type="button" disabled={saving || (settings.enabled && settings.provider === "disabled")} onClick={() => void save()}>
              {saving ? t("Saving settings...") : t("Save Company Settings")}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
