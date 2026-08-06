import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import { useLocale } from "../i18n/LocaleContext";
import {
  deleteSyntheticDataBatch,
  generateSyntheticData,
  getSyntheticDataBatches,
  getSyntheticDataUsers,
  previewSyntheticData,
  type SyntheticAdherence,
  type SyntheticBodyProfile,
  type SyntheticDataBatch,
  type SyntheticDataPreview,
  type SyntheticDataPreviewInput,
  type SyntheticDataUser,
  type SyntheticHydrationPattern,
  type SyntheticSexReference,
  type SyntheticTrend,
} from "../services/syntheticDataService";
import "./SystemOperationsPage.css";
import "./SyntheticDataPage.css";

type PeriodDays = 30 | 60 | 90;

type ScenarioPreset = {
  key: string;
  label: string;
  description: string;
  profile: SyntheticBodyProfile;
  sex: SyntheticSexReference;
  age: number;
  trend: SyntheticTrend;
  adherence: SyntheticAdherence;
  hydration: SyntheticHydrationPattern;
};

const scenarios: ScenarioPreset[] = [
  { key: "healthy", label: "Healthy Adult", description: "Stable weight, normal measurements, and consistent hydration.", profile: "NORMAL", sex: "MALE", age: 35, trend: "STABLE", adherence: "REALISTIC", hydration: "AVERAGE" },
  { key: "office", label: "Overweight Office Worker", description: "Higher starting weight with inconsistent weekday habits.", profile: "OVERWEIGHT", sex: "MALE", age: 44, trend: "IRREGULAR", adherence: "CHAOTIC", hydration: "LOW" },
  { key: "loss", label: "Weight Loss Journey", description: "Gradual loss with realistic daily fluctuations.", profile: "OVERWEIGHT", sex: "FEMALE", age: 38, trend: "LOSS", adherence: "REALISTIC", hydration: "AVERAGE" },
  { key: "athletic", label: "Athletic Adult", description: "Lower body fat, stable weight, and stronger hydration adherence.", profile: "ATHLETIC", sex: "FEMALE", age: 29, trend: "RECOMPOSITION", adherence: "PERFECT", hydration: "HIGH" },
  { key: "senior", label: "Senior Adult", description: "Older adult with gradual variation and conservative change.", profile: "NORMAL", sex: "MALE", age: 68, trend: "STABLE", adherence: "REALISTIC", hydration: "LOW" },
  { key: "underweight", label: "Underweight Recovery", description: "Gradual gain toward a normal range with uneven adherence.", profile: "UNDERWEIGHT", sex: "FEMALE", age: 24, trend: "GAIN", adherence: "REALISTIC", hydration: "AVERAGE" },
];

function readApiError(error: unknown): string {
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    if (response?.data?.error) return response.data.error;
  }
  return "Unable to complete the synthetic data request.";
}

export default function SyntheticDataPage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [users, setUsers] = useState<SyntheticDataUser[]>([]);
  const [batches, setBatches] = useState<SyntheticDataBatch[]>([]);
  const [userId, setUserId] = useState("");
  const [periodDays, setPeriodDays] = useState<PeriodDays>(90);
  const [age, setAge] = useState(35);
  const [bodyProfile, setBodyProfile] = useState<SyntheticBodyProfile>("NORMAL");
  const [sexReference, setSexReference] = useState<SyntheticSexReference>("MALE");
  const [trend, setTrend] = useState<SyntheticTrend>("STABLE");
  const [adherence, setAdherence] = useState<SyntheticAdherence>("REALISTIC");
  const [hydrationPattern, setHydrationPattern] = useState<SyntheticHydrationPattern>("AVERAGE");
  const [dailyWeight, setDailyWeight] = useState(true);
  const [weeklyMeasurements, setWeeklyMeasurements] = useState(true);
  const [dailyHydration, setDailyHydration] = useState(true);
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deletingBatchId, setDeletingBatchId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [serverPreview, setServerPreview] = useState<SyntheticDataPreview | null>(null);
  const [selectedScenario, setSelectedScenario] = useState("healthy");

  const loadBatches = useCallback(async () => {
    const items = await getSyntheticDataBatches();
    setBatches(items);
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([getSyntheticDataUsers(), getSyntheticDataBatches()])
      .then(([userItems, batchItems]) => {
        if (!active) return;
        setUsers(userItems);
        setBatches(batchItems);
        setUserId((current) => current || userItems[0]?.id || "");
      })
      .catch((requestError: unknown) => {
        if (active) setError(readApiError(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const input = useMemo<SyntheticDataPreviewInput>(() => ({
    userId,
    periodDays,
    dailyWeight,
    weeklyMeasurements,
    dailyHydration,
    sexReference,
    age,
    bodyProfile,
    trend,
    adherence,
    hydrationPattern,
  }), [adherence, age, bodyProfile, dailyHydration, dailyWeight, hydrationPattern, periodDays, sexReference, trend, userId, weeklyMeasurements]);

  const selectedUser = users.find((user) => user.id === userId);
  const localPreview = useMemo(() => {
    const adherenceMultiplier = adherence === "PERFECT" ? 1 : adherence === "REALISTIC" ? 0.9 : 0.72;
    const perDay = hydrationPattern === "HIGH" ? 6 : hydrationPattern === "LOW" ? 3 : 4;
    const weightEntries = dailyWeight ? Math.round(periodDays * adherenceMultiplier) : 0;
    const measurementEntries = weeklyMeasurements ? Math.round(Math.ceil(periodDays / 7) * adherenceMultiplier) : 0;
    const hydrationEntries = dailyHydration ? Math.round(periodDays * perDay * adherenceMultiplier) : 0;
    return { weightEntries, measurementEntries, hydrationEntries, total: weightEntries + measurementEntries + hydrationEntries };
  }, [adherence, dailyHydration, dailyWeight, hydrationPattern, periodDays, weeklyMeasurements]);
  const preview = serverPreview?.estimatedRecords ?? localPreview;

  const projectedWeightPoints = useMemo(() => {
    const direction = trend === "LOSS" ? -1 : trend === "GAIN" ? 1 : 0;
    const base = bodyProfile === "UNDERWEIGHT" ? 125 : bodyProfile === "ATHLETIC" ? 165 : bodyProfile === "OVERWEIGHT" ? 225 : bodyProfile === "OBESITY" ? 285 : 180;
    return Array.from({ length: 8 }, (_, index) => Math.round((base + direction * index * 1.4 + Math.sin(index * 1.6) * 1.8) * 10) / 10);
  }, [bodyProfile, trend]);

  function invalidatePreview() {
    setServerPreview(null);
    setSuccess("");
  }

  function applyScenario(scenario: ScenarioPreset) {
    setSelectedScenario(scenario.key);
    setBodyProfile(scenario.profile);
    setSexReference(scenario.sex);
    setAge(scenario.age);
    setTrend(scenario.trend);
    setAdherence(scenario.adherence);
    setHydrationPattern(scenario.hydration);
    invalidatePreview();
  }

  async function handlePreview() {
    setError("");
    setSuccess("");
    setPreviewing(true);
    try {
      setServerPreview(await previewSyntheticData(input));
    } catch (requestError) {
      setError(readApiError(requestError));
    } finally {
      setPreviewing(false);
    }
  }

  async function handleGenerate() {
    if (!serverPreview || !selectedUser) return;
    const confirmed = window.confirm(t(`Generate ${preview.total} synthetic records for ${selectedUser.firstName} ${selectedUser.lastName ?? ""}?`));
    if (!confirmed) return;
    setError("");
    setSuccess("");
    setGenerating(true);
    try {
      const result = await generateSyntheticData(input);
      await loadBatches();
      setSuccess(t(`Synthetic batch created with ${result.batch.counts.total} records. Seed: ${result.batch.seed}.`));
      setServerPreview(null);
    } catch (requestError) {
      setError(readApiError(requestError));
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(batch: SyntheticDataBatch) {
    const confirmed = window.confirm(t(`Delete batch ${batch.id.slice(0, 8)} and all ${batch.recordCounts.total} generated records?`));
    if (!confirmed) return;
    setError("");
    setSuccess("");
    setDeletingBatchId(batch.id);
    try {
      await deleteSyntheticDataBatch(batch.id);
      await loadBatches();
      setSuccess(t("Synthetic batch deleted."));
    } catch (requestError) {
      setError(readApiError(requestError));
    } finally {
      setDeletingBatchId("");
    }
  }

  const canPreview = Boolean(userId) && !previewing && !generating && (dailyWeight || weeklyMeasurements || dailyHydration);
  const canGenerate = Boolean(serverPreview?.generationEnabled) && !generating && !previewing;

  return (
    <main className="ops-page synthetic-lab-page">
      <header className="ops-header synthetic-lab-header">
        <div><p className="ops-eyebrow">{t("Super Administrator")}</p><h1>{t("Synthetic Data Laboratory")}</h1><p>{t("Design, preview, generate, and remove reproducible development-only health histories for existing test users.")}</p></div>
        <Button variant="outline" onClick={() => navigate("/system-operations")}>{t("Back to System Operations")}</Button>
      </header>

      <div className="synthetic-lab-warning"><strong>{t("Development environment only")}</strong><span>{t("This laboratory is blocked outside development and requires explicit backend enablement.")}</span></div>
      {error ? <div className="ops-message synthetic-error" role="alert">{t(error)}</div> : null}
      {success ? <div className="ops-message synthetic-success" role="status">{success}</div> : null}

      <section className="synthetic-lab-grid">
        <article className="ops-panel lab-target-panel">
          <div className="ops-panel-heading"><div><p>{t("Target")}</p><h2>{t("Test user")}</h2></div><span className="ops-badge">{t("Existing account")}</span></div>
          <label className="lab-field"><span>{t("User")}</span><select disabled={loading || users.length === 0} value={userId} onChange={(event) => { setUserId(event.target.value); invalidatePreview(); }}>{loading ? <option value="">{t("Loading users")}</option> : null}{!loading && users.length === 0 ? <option value="">{t("No active users available")}</option> : null}{users.map((user) => <option key={user.id} value={user.id}>{user.firstName} {user.lastName ?? ""} ({user.email})</option>)}</select></label>
          <dl className="lab-user-summary"><div><dt>{t("Name")}</dt><dd>{selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName ?? ""}` : t("Not selected")}</dd></div><div><dt>{t("Email")}</dt><dd>{selectedUser?.email ?? t("Not selected")}</dd></div><div><dt>{t("Age")}</dt><dd>{age}</dd></div><div><dt>{t("Sex reference")}</dt><dd>{t(sexReference.toLowerCase())}</dd></div></dl>
        </article>

        <article className="ops-panel lab-simulation-panel">
          <div className="ops-panel-heading"><div><p>{t("Simulation")}</p><h2>{t("Data and duration")}</h2></div></div>
          <fieldset className="lab-fieldset"><legend>{t("Duration")}</legend><div className="lab-segmented">{[30, 60, 90].map((days) => <button key={days} type="button" className={periodDays === days ? "is-selected" : ""} onClick={() => { setPeriodDays(days as PeriodDays); invalidatePreview(); }}>{days} {t("days")}</button>)}</div></fieldset>
          <fieldset className="lab-fieldset"><legend>{t("Generate")}</legend>
            <label className="lab-check"><input type="checkbox" checked={dailyWeight} onChange={(event) => { setDailyWeight(event.target.checked); invalidatePreview(); }} /><span><strong>{t("Daily weight")}</strong><small>{t("One realistic weight entry per day")}</small></span></label>
            <label className="lab-check"><input type="checkbox" checked={weeklyMeasurements} onChange={(event) => { setWeeklyMeasurements(event.target.checked); invalidatePreview(); }} /><span><strong>{t("Weekly body measurements")}</strong><small>{t("Circumference and composition history")}</small></span></label>
            <label className="lab-check"><input type="checkbox" checked={dailyHydration} onChange={(event) => { setDailyHydration(event.target.checked); invalidatePreview(); }} /><span><strong>{t("Daily hydration")}</strong><small>{t("Multiple beverage entries per day")}</small></span></label>
          </fieldset>
          <div className="lab-field-grid">
            <label className="lab-field"><span>{t("Trend")}</span><select value={trend} onChange={(event) => { setTrend(event.target.value as SyntheticTrend); invalidatePreview(); }}><option value="STABLE">{t("Maintain")}</option><option value="LOSS">{t("Weight loss")}</option><option value="GAIN">{t("Weight gain")}</option><option value="RECOMPOSITION">{t("Body recomposition")}</option><option value="IRREGULAR">{t("Irregular")}</option></select></label>
            <label className="lab-field"><span>{t("Adherence")}</span><select value={adherence} onChange={(event) => { setAdherence(event.target.value as SyntheticAdherence); invalidatePreview(); }}><option value="PERFECT">{t("Perfect")}</option><option value="REALISTIC">{t("Realistic")}</option><option value="CHAOTIC">{t("Chaotic")}</option></select></label>
            <label className="lab-field"><span>{t("Hydration pattern")}</span><select value={hydrationPattern} onChange={(event) => { setHydrationPattern(event.target.value as SyntheticHydrationPattern); invalidatePreview(); }}><option value="HIGH">{t("High intake")}</option><option value="AVERAGE">{t("Average")}</option><option value="LOW">{t("Low intake")}</option><option value="WEEKEND">{t("Weekend variation")}</option></select></label>
          </div>
        </article>

        <article className="ops-panel lab-scenario-panel">
          <div className="ops-panel-heading"><div><p>{t("Scenario")}</p><h2>{t("Simulation presets")}</h2></div></div>
          <div className="scenario-grid">{scenarios.map((scenario) => <button key={scenario.key} type="button" className={selectedScenario === scenario.key ? "scenario-card is-selected" : "scenario-card"} onClick={() => applyScenario(scenario)}><strong>{t(scenario.label)}</strong><span>{t(scenario.description)}</span></button>)}</div>
          <div className="lab-field-grid scenario-controls">
            <label className="lab-field"><span>{t("Age")}</span><input type="number" min={18} max={90} value={age} onChange={(event) => { setAge(Number(event.target.value)); invalidatePreview(); }} /></label>
            <label className="lab-field"><span>{t("Sex reference")}</span><select value={sexReference} onChange={(event) => { setSexReference(event.target.value as SyntheticSexReference); invalidatePreview(); }}><option value="MALE">{t("Male")}</option><option value="FEMALE">{t("Female")}</option></select></label>
            <label className="lab-field"><span>{t("Body profile")}</span><select value={bodyProfile} onChange={(event) => { setBodyProfile(event.target.value as SyntheticBodyProfile); invalidatePreview(); }}><option value="UNDERWEIGHT">{t("Underweight")}</option><option value="NORMAL">{t("Normal range")}</option><option value="OVERWEIGHT">{t("Overweight")}</option><option value="OBESITY">{t("Obesity range")}</option><option value="ATHLETIC">{t("Athletic")}</option></select></label>
          </div>
        </article>

        <aside className="ops-panel lab-preview-panel">
          <div className="ops-panel-heading"><div><p>{t("Preview")}</p><h2>{t("Projected history")}</h2></div><span className="ops-badge planned">{t("Deterministic")}</span></div>
          <div className="lab-chart" aria-label={t("Projected weight trend")}>{projectedWeightPoints.map((value, index) => <div key={`${value}-${index}`}><span style={{ height: `${Math.max(22, 38 + (value - projectedWeightPoints[0]) * 7)}%` }} /><small>{value}</small></div>)}</div>
          <div className="lab-counts"><div><strong>{preview.weightEntries}</strong><span>{t("Weight")}</span></div><div><strong>{preview.measurementEntries}</strong><span>{t("Measurements")}</span></div><div><strong>{preview.hydrationEntries}</strong><span>{t("Hydration")}</span></div><div><strong>{preview.total}</strong><span>{t("Total")}</span></div></div>
          <div className="preview-summary">{t("Scenario")}: {t(selectedScenario)}, {age}, {t(trend.toLowerCase())}, {t(adherence.toLowerCase())}</div>
          <button type="button" className="lab-primary-action" disabled={!canPreview} onClick={() => void handlePreview()}>{previewing ? t("Preparing preview") : t("Validate preview")}</button>
          <button type="button" className="lab-generate-action" disabled={!canGenerate} onClick={() => void handleGenerate()}>{generating ? t("Generating batch") : t("Generate batch")}</button>
          <p>{serverPreview ? t("Preview validated. Confirm generation to write a rollback-safe batch.") : t("Validate the scenario before generation.")}</p>
        </aside>
      </section>

      <section className="ops-panel lab-history-panel">
        <div className="ops-panel-heading"><div><p>{t("History")}</p><h2>{t("Synthetic data batches")}</h2></div><span className="ops-badge">{batches.length}</span></div>
        {loading ? <p>{t("Loading batches")}</p> : null}
        {!loading && batches.length === 0 ? <p>{t("No synthetic batches have been generated yet.")}</p> : null}
        <div className="batch-history-list">{batches.map((batch) => <article className="batch-history-card" key={batch.id}>
          <div><strong>{batch.firstName} {batch.lastName ?? ""}</strong><span>{batch.email}</span></div>
          <dl><div><dt>{t("Created")}</dt><dd>{new Date(batch.createdAt).toLocaleString()}</dd></div><div><dt>{t("Period")}</dt><dd>{batch.periodDays} {t("days")}</dd></div><div><dt>{t("Records")}</dt><dd>{batch.recordCounts.total}</dd></div><div><dt>{t("Seed")}</dt><dd>{batch.seed}</dd></div></dl>
          <div className="batch-count-breakdown"><span>{batch.recordCounts.weightEntries} {t("weight")}</span><span>{batch.recordCounts.measurementEntries} {t("measurements")}</span><span>{batch.recordCounts.hydrationEntries} {t("hydration")}</span></div>
          <button type="button" className="batch-delete-action" disabled={deletingBatchId === batch.id} onClick={() => void handleDelete(batch)}>{deletingBatchId === batch.id ? t("Deleting batch") : t("Delete batch")}</button>
        </article>)}</div>
      </section>
    </main>
  );
}
