import { useEffect, useState } from "react";
import { useLocale } from "../i18n/LocaleContext";
import {
  getSyntheticAccess,
  provisionSyntheticAccess,
  type SyntheticAccess,
} from "../services/syntheticDataService";
import "./SyntheticAccessPanel.css";

function readApiError(error: unknown): string {
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    if (response?.data?.error) return response.data.error;
  }
  return "Unable to provision development access.";
}

export default function SyntheticAccessPanel({ userId }: { userId: string }) {
  const { t } = useLocale();
  const [access, setAccess] = useState<SyntheticAccess | null>(null);
  const [planKey, setPlanKey] = useState("premium");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    if (!userId) return () => { active = false; };

    void getSyntheticAccess(userId)
      .then((result) => {
        if (!active) return;
        setAccess(result);
        setError("");
        setMessage("");
        if (result.activeSubscription) setPlanKey(result.activeSubscription.plan.key);
        else if (result.plans.some((plan) => plan.key === "premium")) setPlanKey("premium");
        else if (result.plans[0]) setPlanKey(result.plans[0].key);
      })
      .catch((requestError) => {
        if (!active) return;
        setAccess(null);
        setError(readApiError(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [userId]);

  async function handleProvision() {
    if (!userId || !planKey || access?.activeSubscription) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await provisionSyntheticAccess(userId, planKey);
      setAccess((current) => current ? { ...current, activeSubscription: result.subscription } : current);
      setMessage(result.created ? t("Development access provisioned. The user should sign out and sign back in.") : t("The user already has active access."));
    } catch (requestError) {
      setError(readApiError(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="synthetic-access-panel" aria-label={t("Development access")}>
      <div className="synthetic-access-heading">
        <div><span>{t("Access")}</span><strong>{t("Development subscription")}</strong></div>
        <span className={access?.activeSubscription ? "access-status is-active" : "access-status is-missing"}>
          {loading ? t("Checking") : access?.activeSubscription ? t("Active") : t("Missing")}
        </span>
      </div>
      {access?.activeSubscription ? (
        <div className="synthetic-access-current">
          <strong>{access.activeSubscription.plan.name}</strong>
          <span>{t("Existing active subscriptions are never replaced by this tool.")}</span>
        </div>
      ) : (
        <div className="synthetic-access-controls">
          <label className="lab-field">
            <span>{t("Plan")}</span>
            <select value={planKey} disabled={loading || saving} onChange={(event) => setPlanKey(event.target.value)}>
              {(access?.plans ?? []).map((plan) => <option key={plan.id} value={plan.key}>{plan.name}</option>)}
            </select>
          </label>
          <button type="button" className="access-provision-action" disabled={!userId || loading || saving || !planKey} onClick={() => void handleProvision()}>
            {saving ? t("Provisioning access") : t("Provision development access")}
          </button>
        </div>
      )}
      {error ? <p className="synthetic-access-error" role="alert">{t(error)}</p> : null}
      {message ? <p className="synthetic-access-message" role="status">{message}</p> : null}
    </section>
  );
}
