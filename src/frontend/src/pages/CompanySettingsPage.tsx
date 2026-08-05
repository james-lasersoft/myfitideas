import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminBadge, AdminLoadingState, AdminPageHeader } from "../components/admin/AdminComponents";
import { useLocale } from "../i18n/LocaleContext";
import api from "../services/api";
import "./Admin.css";
import "./AdminConsoleTheme.css";
import "./CompanySettingsPage.css";

type GeolocationProvider = "disabled" | "ipinfo" | "custom";
type EmailProvider = "disabled" | "console" | "smtp" | "ses" | "sendgrid" | "mailgun" | "postmark" | "custom";
type BillingProvider = "disabled" | "manual" | "stripe" | "paddle" | "braintree" | "adyen" | "custom";
type ProviderMode = "test" | "production";
type SettingsSection = "email" | "billing" | "geolocation";

interface GeolocationSettings {
  enabled: boolean;
  provider: GeolocationProvider;
  credentialEnvironmentVariable: string;
  lookupOnNewLoginOnly: boolean;
  retainApproximateCoordinates: boolean;
  displayCityRegionCountry: boolean;
  testMode: boolean;
}

interface ProviderConfiguration<TProvider extends string> {
  enabled: boolean;
  provider: TProvider;
  mode: ProviderMode;
  credentialEnvironmentVariable: string;
  secondaryCredentialEnvironmentVariable: string;
  configuration: Record<string, string>;
}

interface IntegrationSettings {
  email: ProviderConfiguration<EmailProvider>;
  billing: ProviderConfiguration<BillingProvider>;
}

interface GeolocationResponse {
  settings: GeolocationSettings;
  capabilities: { credentialConfigured: boolean };
}

interface IntegrationResponse {
  settings: IntegrationSettings;
  capabilities: {
    emailCredentialConfigured: boolean;
    billingCredentialConfigured: boolean;
    billingSecondaryCredentialConfigured: boolean;
    secretsStoredInDatabase: boolean;
  };
}

const emailLabels: Record<EmailProvider, string> = {
  disabled: "Disabled",
  console: "Development console",
  smtp: "SMTP",
  ses: "Amazon SES",
  sendgrid: "SendGrid",
  mailgun: "Mailgun",
  postmark: "Postmark",
  custom: "Custom provider",
};

const billingLabels: Record<BillingProvider, string> = {
  disabled: "Disabled",
  manual: "Manual billing",
  stripe: "Stripe",
  paddle: "Paddle",
  braintree: "Braintree",
  adyen: "Adyen",
  custom: "Custom provider",
};

export default function CompanySettingsPage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [activeSection, setActiveSection] = useState<SettingsSection>("email");
  const [settings, setSettings] = useState<GeolocationSettings | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationSettings | null>(null);
  const [credentialConfigured, setCredentialConfigured] = useState(false);
  const [integrationCapabilities, setIntegrationCapabilities] = useState<IntegrationResponse["capabilities"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([
      api.get<GeolocationResponse>("/api/v1/admin/settings/geolocation"),
      api.get<IntegrationResponse>("/api/v1/admin/settings/integrations"),
    ])
      .then(([geolocationResponse, integrationResponse]) => {
        setSettings(geolocationResponse.data.settings);
        setCredentialConfigured(geolocationResponse.data.capabilities.credentialConfigured);
        setIntegrations(integrationResponse.data.settings);
        setIntegrationCapabilities(integrationResponse.data.capabilities);
      })
      .catch(() => setError(t("Unable to load company settings.")))
      .finally(() => setLoading(false));
  }, [t]);

  const updateEmail = (patch: Partial<ProviderConfiguration<EmailProvider>>) => {
    if (!integrations) return;
    setIntegrations({ ...integrations, email: { ...integrations.email, ...patch } });
  };

  const updateBilling = (patch: Partial<ProviderConfiguration<BillingProvider>>) => {
    if (!integrations) return;
    setIntegrations({ ...integrations, billing: { ...integrations.billing, ...patch } });
  };

  const saveChanges = async () => {
    if (!settings || !integrations) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      if (activeSection === "geolocation") {
        const response = await api.put<GeolocationResponse>("/api/v1/admin/settings/geolocation", settings);
        setSettings(response.data.settings);
        setCredentialConfigured(response.data.capabilities.credentialConfigured);
      } else {
        const response = await api.put<IntegrationResponse>("/api/v1/admin/settings/integrations", integrations);
        setIntegrations(response.data.settings);
        setIntegrationCapabilities(response.data.capabilities);
      }
      setMessage(t("Company settings updated."));
    } catch {
      setError(t("Unable to update company settings."));
    } finally {
      setSaving(false);
    }
  };

  const emailReady = integrations?.email.enabled && (integrations.email.provider === "console" || integrationCapabilities?.emailCredentialConfigured);
  const billingReady = integrations?.billing.enabled && integrationCapabilities?.billingCredentialConfigured;
  const geolocationReady = settings?.testMode || (settings?.enabled && credentialConfigured);

  const statusBadge = (enabled: boolean, ready: boolean, development = false) => {
    if (!enabled && !development) return <AdminBadge tone="neutral" dot>{t("Disabled")}</AdminBadge>;
    if (development) return <AdminBadge tone="warning" dot>{t("Test data mode")}</AdminBadge>;
    return ready
      ? <AdminBadge tone="success" dot>{t("Configured in environment")}</AdminBadge>
      : <AdminBadge tone="warning" dot>{t("Not configured")}</AdminBadge>;
  };

  if (loading || !settings || !integrations) {
    return (
      <main className="admin-page admin-console-page company-settings-page">
        <AdminPageHeader eyebrow={t("Organization Controls")} title={t("Company Settings")} description={t("Configure provider-neutral services and security policies without storing provider secrets in MyFitIdeas.")} backLabel={t("Back to Admin Center")} onBack={() => navigate("/admin")} />
        <AdminLoadingState label={t("Loading company settings...")} />
      </main>
    );
  }

  return (
    <main className="admin-page admin-console-page company-settings-page">
      <AdminPageHeader eyebrow={t("Organization Controls")} title={t("Company Settings")} description={t("Configure provider-neutral services and security policies without storing provider secrets in MyFitIdeas.")} backLabel={t("Back to Admin Center")} onBack={() => navigate("/admin")} />

      {error && <p className="form-message error-message" role="alert">{error}</p>}
      {message && <p className="form-message success-message" role="status">{message}</p>}

      <section className="integration-overview" aria-labelledby="integration-overview-title">
        <div className="integration-overview-copy">
          <p className="settings-eyebrow">{t("Provider integrations")}</p>
          <h2 id="integration-overview-title">{t("Choose a service to configure")}</h2>
          <p>{t("Review status at a glance, then open one provider to manage its settings.")}</p>
        </div>
        <div className="integration-summary-grid">
          <button type="button" className={activeSection === "email" ? "integration-summary-card active" : "integration-summary-card"} onClick={() => setActiveSection("email")}>
            <span className="integration-summary-icon" aria-hidden="true">✉</span>
            <span><strong>{t("Email Provider")}</strong><small>{t(emailLabels[integrations.email.provider])}</small></span>
            {statusBadge(integrations.email.enabled, Boolean(emailReady))}
          </button>
          <button type="button" className={activeSection === "billing" ? "integration-summary-card active" : "integration-summary-card"} onClick={() => setActiveSection("billing")}>
            <span className="integration-summary-icon" aria-hidden="true">$</span>
            <span><strong>{t("Billing Provider")}</strong><small>{t(billingLabels[integrations.billing.provider])}</small></span>
            {statusBadge(integrations.billing.enabled, Boolean(billingReady))}
          </button>
          <button type="button" className={activeSection === "geolocation" ? "integration-summary-card active" : "integration-summary-card"} onClick={() => setActiveSection("geolocation")}>
            <span className="integration-summary-icon" aria-hidden="true">◎</span>
            <span><strong>{t("IP Geolocation Provider")}</strong><small>{settings.provider === "ipinfo" ? "IPinfo" : t(settings.provider === "custom" ? "Custom provider" : "Disabled")}</small></span>
            {statusBadge(settings.enabled, Boolean(geolocationReady), settings.testMode)}
          </button>
        </div>
      </section>

      <section className="integration-workspace">
        <nav className="integration-nav" aria-label={t("Provider integrations")}>
          <button type="button" className={activeSection === "email" ? "active" : ""} onClick={() => setActiveSection("email")}><span aria-hidden="true">✉</span><span><strong>{t("Email Provider")}</strong><small>{t("Verification, password reset, and account messages use a provider-neutral delivery service.")}</small></span></button>
          <button type="button" className={activeSection === "billing" ? "active" : ""} onClick={() => setActiveSection("billing")}><span aria-hidden="true">$</span><span><strong>{t("Billing Provider")}</strong><small>{t("Checkout and subscription features use a provider-neutral billing service and remain disabled until launch.")}</small></span></button>
          <button type="button" className={activeSection === "geolocation" ? "active" : ""} onClick={() => setActiveSection("geolocation")}><span aria-hidden="true">◎</span><span><strong>{t("IP Geolocation Provider")}</strong><small>{t("Approximate login location is derived from the public IP address only. Device GPS is never requested.")}</small></span></button>
        </nav>

        <div className="integration-detail-card">
          {activeSection === "email" && (
            <>
              <div className="integration-detail-heading"><div><p className="settings-eyebrow">{t("Provider integrations")}</p><h2>{t("Email Provider")}</h2><p>{t("Verification, password reset, and account messages use a provider-neutral delivery service.")}</p></div>{statusBadge(integrations.email.enabled, Boolean(emailReady))}</div>
              <label className="integration-enable-row"><span><strong>{t("Enable email delivery")}</strong><small>{t("The development console provider can be used before a commercial email service is selected.")}</small></span><input type="checkbox" checked={integrations.email.enabled} onChange={(event) => updateEmail({ enabled: event.target.checked })} /></label>
              <div className="company-settings-grid compact-grid">
                <label>{t("Provider")}<select value={integrations.email.provider} onChange={(event) => updateEmail({ provider: event.target.value as EmailProvider })}>{(Object.keys(emailLabels) as EmailProvider[]).map((provider) => <option key={provider} value={provider}>{t(emailLabels[provider])}</option>)}</select></label>
                <label>{t("Mode")}<select value={integrations.email.mode} onChange={(event) => updateEmail({ mode: event.target.value as ProviderMode })}><option value="test">{t("Test")}</option><option value="production">{t("Production")}</option></select></label>
                <label>{t("From address")}<input value={integrations.email.configuration.fromAddress ?? ""} onChange={(event) => updateEmail({ configuration: { ...integrations.email.configuration, fromAddress: event.target.value } })} placeholder="noreply@example.com" data-no-translate="true" autoComplete="off" /></label>
                <label>{t("From name")}<input value={integrations.email.configuration.fromName ?? ""} onChange={(event) => updateEmail({ configuration: { ...integrations.email.configuration, fromName: event.target.value } })} placeholder="MyFitIdeas" autoComplete="off" /></label>
              </div>
              <details className="integration-advanced"><summary>{t("Advanced settings")}</summary><div className="company-settings-grid compact-grid"><label>{t("Primary credential environment variable")}<input value={integrations.email.credentialEnvironmentVariable} onChange={(event) => updateEmail({ credentialEnvironmentVariable: event.target.value.toUpperCase() })} placeholder="EMAIL_PROVIDER_API_KEY" autoComplete="off" /></label><label>{t("Secondary credential environment variable")}<input value={integrations.email.secondaryCredentialEnvironmentVariable} onChange={(event) => updateEmail({ secondaryCredentialEnvironmentVariable: event.target.value.toUpperCase() })} placeholder="EMAIL_PROVIDER_SECRET" autoComplete="off" /></label></div></details>
            </>
          )}

          {activeSection === "billing" && (
            <>
              <div className="integration-detail-heading"><div><p className="settings-eyebrow">{t("Provider integrations")}</p><h2>{t("Billing Provider")}</h2><p>{t("Checkout and subscription features use a provider-neutral billing service and remain disabled until launch.")}</p></div>{statusBadge(integrations.billing.enabled, Boolean(billingReady))}</div>
              <label className="integration-enable-row"><span><strong>{t("Enable billing integration")}</strong><small>{t("Keep billing disabled until plans, legal terms, and provider verification are ready.")}</small></span><input type="checkbox" checked={integrations.billing.enabled} onChange={(event) => updateBilling({ enabled: event.target.checked })} /></label>
              <div className="company-settings-grid compact-grid"><label>{t("Provider")}<select value={integrations.billing.provider} onChange={(event) => updateBilling({ provider: event.target.value as BillingProvider })}>{(Object.keys(billingLabels) as BillingProvider[]).map((provider) => <option key={provider} value={provider}>{t(billingLabels[provider])}</option>)}</select></label><label>{t("Mode")}<select value={integrations.billing.mode} onChange={(event) => updateBilling({ mode: event.target.value as ProviderMode })}><option value="test">{t("Test")}</option><option value="production">{t("Production")}</option></select></label></div>
              <details className="integration-advanced"><summary>{t("Advanced settings")}</summary><div className="company-settings-grid compact-grid"><label>{t("Primary credential environment variable")}<input value={integrations.billing.credentialEnvironmentVariable} onChange={(event) => updateBilling({ credentialEnvironmentVariable: event.target.value.toUpperCase() })} placeholder="BILLING_PROVIDER_API_KEY" autoComplete="off" /></label><label>{t("Secondary credential environment variable")}<input value={integrations.billing.secondaryCredentialEnvironmentVariable} onChange={(event) => updateBilling({ secondaryCredentialEnvironmentVariable: event.target.value.toUpperCase() })} placeholder="BILLING_PROVIDER_SECRET" autoComplete="off" /></label><label>{t("Webhook secret environment variable")}<input value={integrations.billing.configuration.webhookSecretEnvironmentVariable ?? ""} onChange={(event) => updateBilling({ configuration: { ...integrations.billing.configuration, webhookSecretEnvironmentVariable: event.target.value.toUpperCase() } })} placeholder="BILLING_WEBHOOK_SECRET" autoComplete="off" /></label></div></details>
            </>
          )}

          {activeSection === "geolocation" && (
            <>
              <div className="integration-detail-heading"><div><p className="settings-eyebrow">{t("Provider integrations")}</p><h2>{t("IP Geolocation Provider")}</h2><p>{t("Approximate login location is derived from the public IP address only. Device GPS is never requested.")}</p></div>{statusBadge(settings.enabled, Boolean(geolocationReady), settings.testMode)}</div>
              <label className="integration-enable-row"><span><strong>{t("Enable provider lookups")}</strong><small>{t("Keep disabled while using seeded test locations.")}</small></span><input type="checkbox" checked={settings.enabled} onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })} /></label>
              <div className="company-settings-grid compact-grid"><label>{t("Provider")}<select value={settings.provider} onChange={(event) => setSettings({ ...settings, provider: event.target.value as GeolocationProvider })}><option value="disabled">{t("Disabled")}</option><option value="ipinfo" data-no-translate>IPinfo</option><option value="custom">{t("Custom provider")}</option></select></label><label>{t("Credential environment variable")}<input value={settings.credentialEnvironmentVariable} onChange={(event) => setSettings({ ...settings, credentialEnvironmentVariable: event.target.value.toUpperCase() })} placeholder="IPINFO_TOKEN" autoComplete="off" /></label></div>
              <details className="integration-advanced"><summary>{t("Advanced settings")}</summary><div className="settings-toggle-list compact-toggle-list"><label><input type="checkbox" checked={settings.lookupOnNewLoginOnly} onChange={(event) => setSettings({ ...settings, lookupOnNewLoginOnly: event.target.checked })} /><span><strong>{t("Lookup only when a new login session is created")}</strong><small>{t("Persist the result and avoid repeated provider requests.")}</small></span></label><label><input type="checkbox" checked={settings.displayCityRegionCountry} onChange={(event) => setSettings({ ...settings, displayCityRegionCountry: event.target.checked })} /><span><strong>{t("Display city, region, and country")}</strong><small>{t("Show an approximate location in member and administrator security views.")}</small></span></label><label><input type="checkbox" checked={settings.retainApproximateCoordinates} onChange={(event) => setSettings({ ...settings, retainApproximateCoordinates: event.target.checked })} /><span><strong>{t("Retain approximate coordinates")}</strong><small>{t("Disabled by default to minimize stored location data.")}</small></span></label><label><input type="checkbox" checked={settings.testMode} onChange={(event) => setSettings({ ...settings, testMode: event.target.checked })} /><span><strong>{t("Use seeded test location data")}</strong><small>{t("Allows interface testing without a paid provider account.")}</small></span></label></div></details>
            </>
          )}

          <div className="integration-footer">
            <div className="integration-security-note"><strong>{t("Secret handling")}</strong><span>{t("Provider tokens are never stored in the database, audit logs, browser, or source repository. Company Settings stores only provider selection, non-secret options, and environment-variable names.")}</span></div>
            <button type="button" disabled={saving || (activeSection === "email" && integrations.email.enabled && integrations.email.provider === "disabled") || (activeSection === "billing" && integrations.billing.enabled && integrations.billing.provider === "disabled") || (activeSection === "geolocation" && settings.enabled && settings.provider === "disabled")} onClick={() => void saveChanges()}>{saving ? t("Saving settings...") : t("Save Changes")}</button>
          </div>
        </div>
      </section>
    </main>
  );
}
