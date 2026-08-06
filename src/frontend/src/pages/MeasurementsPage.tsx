import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { createBodyWeight, getBodyWeightError, type BodyWeight } from "../services/bodyWeightService";
import {
  createMeasurement,
  getMeasurementData,
  getMeasurementError,
  getMeasurementGuardrail,
  type CreateMeasurementInput,
  type LengthUnit,
  type Measurement,
  type MeasurementDisplayUnits,
  type MeasurementProfileMetrics,
  type WeightUnit,
} from "../services/measurementService";
import { formatMeasurement, getMeasurementStep } from "../utils/measurementFormat";
import "./MeasurementsPage.css";

const DEFAULT_DISPLAY_UNITS: MeasurementDisplayUnits = { weight: "lb", length: "in" };
type EntryMode = "NEWBIE" | "NORMAL" | "PRO";
type TrendMetric = "weight" | "bodyFat" | "waistToHeightRatio" | "waist";
type SessionField = Exclude<keyof CreateMeasurementInput, "weight" | "weightUnit" | "lengthUnit" | "measurementDate" | "confirmAnomaly">;

const FIELD_LABELS: Record<SessionField, string> = {
  waist: "Waist", chest: "Chest", hips: "Hips", neck: "Neck", abdomen: "Abdomen",
  leftBicep: "Left bicep", rightBicep: "Right bicep", leftForearm: "Left forearm",
  rightForearm: "Right forearm", leftThigh: "Left thigh", rightThigh: "Right thigh",
  leftCalf: "Left calf", rightCalf: "Right calf", bodyFat: "Body fat",
};

const GUIDANCE: Partial<Record<SessionField, string>> = {
  neck: "Place the tape just below the larynx and keep it level without compressing the skin.",
  chest: "Measure around the fullest part of the chest with the tape parallel to the floor.",
  waist: "Measure at the narrowest point of the torso or at the natural waist.",
  abdomen: "Measure level with the navel after a normal exhale.",
  hips: "Measure around the widest point of the hips and glutes.",
  leftBicep: "Measure the midpoint of the relaxed upper arm.", rightBicep: "Measure the midpoint of the relaxed upper arm.",
  leftForearm: "Measure around the widest part of the relaxed forearm.", rightForearm: "Measure around the widest part of the relaxed forearm.",
  leftThigh: "Measure around the widest part of the upper thigh.", rightThigh: "Measure around the widest part of the upper thigh.",
  leftCalf: "Measure around the widest part of the calf.", rightCalf: "Measure around the widest part of the calf.",
};

const MODE_FIELDS: Record<EntryMode, SessionField[]> = {
  NEWBIE: ["neck", "waist", "abdomen", "hips"],
  NORMAL: ["neck", "chest", "waist", "abdomen", "hips", "leftBicep", "rightBicep", "leftThigh", "rightThigh"],
  PRO: ["neck", "chest", "waist", "abdomen", "hips", "leftBicep", "rightBicep", "leftForearm", "rightForearm", "leftThigh", "rightThigh", "leftCalf", "rightCalf", "bodyFat"],
};

function getLocalDateTimeValue(date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
function optionalNumber(value: string): number | undefined { return value.trim() === "" ? undefined : Number(value); }
function methodLabel(method: string | null): string {
  if (!method) return "Not calculated";
  if (method === "US_NAVY_CIRCUMFERENCE") return "U.S. Navy circumference estimate";
  if (method === "WAIST_CM_DIVIDED_BY_HEIGHT_CM") return "Waist ÷ height";
  if (method === "USER_PROVIDED") return "User provided";
  return method.replaceAll("_", " ").toLowerCase();
}
function formatValue(value: number | null | undefined, unit = ""): string {
  if (value == null) return "—";
  return `${formatMeasurement(value, unit as WeightUnit | LengthUnit | "%")} ${unit}`.trim();
}

interface TrendPoint { date: string; value: number; }
function MiniTrendChart({ points, label, unit }: { points: TrendPoint[]; label: string; unit: string }) {
  const visible = points.slice(-16);
  if (visible.length < 2) return <div className="measurement-chart-empty">Add at least two entries to see a trend.</div>;
  const values = visible.map((point) => point.value);
  const min = Math.min(...values); const max = Math.max(...values); const span = Math.max(max - min, 0.01);
  const coordinates = visible.map((point, index) => ({ x: 20 + (index / Math.max(visible.length - 1, 1)) * 560, y: 180 - ((point.value - min) / span) * 140 }));
  return <div className="measurement-chart-wrap">
    <svg className="measurement-chart" viewBox="0 0 600 210" role="img" aria-label={`${label} trend chart`}>
      <line x1="20" x2="580" y1="180" y2="180" className="measurement-chart-axis" />
      <line x1="20" x2="580" y1="40" y2="40" className="measurement-chart-grid" />
      <line x1="20" x2="580" y1="110" y2="110" className="measurement-chart-grid" />
      <polyline points={coordinates.map((point) => `${point.x},${point.y}`).join(" ")} className="measurement-chart-line" />
      {visible.map((point, index) => <circle key={`${point.date}-${index}`} cx={coordinates[index].x} cy={coordinates[index].y} r="4" className="measurement-chart-point"><title>{`${new Date(point.date).toLocaleString()}: ${formatValue(point.value, unit)}`}</title></circle>)}
    </svg>
    <div className="measurement-chart-range"><span>{formatValue(min, unit)}</span><span>{formatValue(max, unit)}</span></div>
  </div>;
}

export default function MeasurementsPage() {
  const navigate = useNavigate();
  const [weights, setWeights] = useState<BodyWeight[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [profileMetrics, setProfileMetrics] = useState<MeasurementProfileMetrics | null>(null);
  const [displayUnits, setDisplayUnits] = useState<MeasurementDisplayUnits>(DEFAULT_DISPLAY_UNITS);
  const [entryMode, setEntryMode] = useState<EntryMode>("NEWBIE");
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("weight");
  const [measurementRecordedAt, setMeasurementRecordedAt] = useState(getLocalDateTimeValue());
  const [weightRecordedAt, setWeightRecordedAt] = useState(getLocalDateTimeValue());
  const [weightValue, setWeightValue] = useState("");
  const [formValues, setFormValues] = useState<Record<SessionField, string>>(() => Object.fromEntries(Object.keys(FIELD_LABELS).map((key) => [key, ""])) as Record<SessionField, string>);
  const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true); const [isSaving, setIsSaving] = useState(false); const [isSavingWeight, setIsSavingWeight] = useState(false);

  const applyData = (data: Awaited<ReturnType<typeof getMeasurementData>>): void => {
    setWeights(data.weights); setMeasurements(data.measurementSessions); setProfileMetrics(data.profileMetrics);
    setDisplayUnits({ weight: data.weights[0]?.displayUnit ?? data.measurementSessions[0]?.displayUnits?.weight ?? "lb", length: data.profileMetrics.displayUnit });
  };
  const refreshMeasurements = async (): Promise<void> => applyData(await getMeasurementData());

  useEffect(() => {
    let cancelled = false;
    getMeasurementData().then((data) => { if (!cancelled) applyData(data); })
      .catch(() => { if (!cancelled) setError("Unable to load body transformation data."); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const latestWeight = weights[0] ?? null;
  const latestSession = measurements[0] ?? null;
  const latestWithBodyFat = measurements.find((item) => item.bodyFat != null) ?? null;
  const latestWithRatio = measurements.find((item) => item.waistToHeightRatio != null) ?? null;
  const latestWithComposition = measurements.find((item) => item.fatMass != null || item.leanMass != null) ?? null;

  const trend = useMemo(() => {
    if (trendMetric === "weight") return { label: "Weight", unit: displayUnits.weight, points: weights.slice().reverse().map((item) => ({ date: item.recordedAt, value: item.weight })) };
    const unit = trendMetric === "bodyFat" ? "%" : trendMetric === "waist" ? displayUnits.length : "";
    return { label: trendMetric, unit, points: measurements.slice().reverse().map((item) => ({ date: item.measurementDate, value: item[trendMetric] as number | null })).filter((point): point is TrendPoint => point.value != null) };
  }, [displayUnits, measurements, trendMetric, weights]);

  const setField = (field: SessionField, value: string): void => setFormValues((current) => ({ ...current, [field]: value }));
  const clearForm = (): void => {
    setFormValues(Object.fromEntries(Object.keys(FIELD_LABELS).map((key) => [key, ""])) as Record<SessionField, string>);
    setMeasurementRecordedAt(getLocalDateTimeValue());
  };

  const submitMeasurement = async (input: CreateMeasurementInput): Promise<void> => {
    try { await createMeasurement(input); }
    catch (caught) {
      const guardrail = getMeasurementGuardrail(caught); if (!guardrail) throw caught;
      const details = guardrail.issues.map((issue) => `${issue.field}: ${issue.message}`).join("\n");
      if (!window.confirm(`${guardrail.message}\n\n${details}\n\nSave this entry as confirmed?`)) throw new Error("ENTRY_REVIEW_REQUESTED", { cause: caught });
      await createMeasurement({ ...input, confirmAnomaly: true });
    }
  };

  const handleWeightSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault(); setMessage(""); setError("");
    const weight = optionalNumber(weightValue);
    const observedAt = new Date(weightRecordedAt);
    if (weight === undefined || !Number.isFinite(weight) || weight <= 0) { setError("Enter a valid positive weight."); return; }
    if (Number.isNaN(observedAt.getTime())) { setError("Enter a valid observation date and time."); return; }
    setIsSavingWeight(true);
    try {
      await createBodyWeight({ weight, unit: displayUnits.weight, recordedAt: observedAt.toISOString(), timezoneOffsetMinutes: observedAt.getTimezoneOffset() });
      await refreshMeasurements(); setWeightValue(""); setWeightRecordedAt(getLocalDateTimeValue()); setMessage("Weight observation saved. A same-day manual entry is replaced rather than duplicated.");
    } catch (caught) { setError(getBodyWeightError(caught)); }
    finally { setIsSavingWeight(false); }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault(); setMessage(""); setError("");
    const visibleFields = MODE_FIELDS[entryMode];
    const observedAt = new Date(measurementRecordedAt);
    if (Number.isNaN(observedAt.getTime())) { setError("Enter a valid measurement date and time."); return; }
    const input = visibleFields.reduce<CreateMeasurementInput>((result, field) => {
      const value = optionalNumber(formValues[field]);
      if (value !== undefined) result[field] = value;
      return result;
    }, { lengthUnit: displayUnits.length, measurementDate: observedAt.toISOString() });
    const supplied = visibleFields.filter((field) => input[field] !== undefined);
    if (supplied.length === 0) { setError("Enter at least one body measurement."); return; }
    if (supplied.some((field) => !Number.isFinite(input[field]) || Number(input[field]) <= 0)) { setError("Measurement values must be positive numbers."); return; }
    setIsSaving(true);
    try { await submitMeasurement(input); await refreshMeasurements(); clearForm(); setMessage("Body measurement session saved successfully."); }
    catch (caught) { setError(caught instanceof Error && caught.message === "ENTRY_REVIEW_REQUESTED" ? "Measurement was not saved." : getMeasurementError(caught)); }
    finally { setIsSaving(false); }
  };

  return <main className="dashboard-page measurements-page">
    <header className="dashboard-header page-brand-header measurements-header">
      <div className="page-brand-heading"><BrandLogo variant="symbol" className="page-brand-symbol" /><div><h1>Body Measurements</h1><p>Record daily weight separately from guided body-measurement sessions.</p></div></div>
      <div className="measurements-header-actions"><button type="button" className="secondary-button" onClick={() => navigate("/dashboard")}>Back to Dashboard</button></div>
    </header>
    {error && <div className="measurement-banner measurement-banner-error">{error}</div>}
    {message && <div className="measurement-banner measurement-banner-success">{message}</div>}

    <section className="measurement-quick-actions">
      <article className="dashboard-card daily-weight-card">
        <div className="measurement-section-heading"><div><span className="measurement-eyebrow">Daily check-in</span><h2>Today's weight</h2></div></div>
        <div className="daily-weight-summary"><strong>{formatValue(latestWeight?.weight, displayUnits.weight)}</strong><span>{latestWeight ? `Last recorded ${new Date(latestWeight.recordedAt).toLocaleString()}` : "No weight recorded yet"}</span></div>
        <form className="daily-weight-form" onSubmit={handleWeightSubmit}>
          <label><span>Weight <em>{displayUnits.weight}</em></span><input type="number" min="0" step={getMeasurementStep(displayUnits.weight)} value={weightValue} onChange={(event) => setWeightValue(event.target.value)} /></label>
          <label><span>Observed at</span><input type="datetime-local" max={getLocalDateTimeValue()} value={weightRecordedAt} onChange={(event) => setWeightRecordedAt(event.target.value)} required /></label>
          <button type="submit" disabled={isSavingWeight}>{isSavingWeight ? "Saving..." : "Record weight"}</button>
        </form>
      </article>

      <article className="dashboard-card measurement-session-summary-card">
        <div className="measurement-section-heading"><div><span className="measurement-eyebrow">Weekly workflow</span><h2>Body measurement session</h2></div></div>
        <div className="measurement-session-summary"><strong>{latestSession ? new Date(latestSession.measurementDate).toLocaleString() : "No session yet"}</strong><span>{latestSession ? "Latest completed session" : "Complete your first circumference session"}</span></div>
        <a className="measurement-session-jump" href="#measurement-session-entry">Start measurement session</a>
      </article>
    </section>

    <section className="measurements-top-grid">
      <article className="dashboard-card measurement-insights-card">
        <div className="measurement-section-heading"><div><span className="measurement-eyebrow">Progress overview</span><h2>Body transformation metrics</h2></div><select value={trendMetric} onChange={(event) => setTrendMetric(event.target.value as TrendMetric)} aria-label="Trend metric"><option value="weight">Weight</option><option value="bodyFat">Body fat</option><option value="waistToHeightRatio">Waist-to-height</option><option value="waist">Waist</option></select></div>
        <MiniTrendChart points={trend.points} label={trend.label} unit={trend.unit} />
        <div className="measurement-metric-grid">
          <div className="measurement-metric"><span>Latest weight</span><strong>{formatValue(latestWeight?.weight, displayUnits.weight)}</strong><small>{latestWeight ? new Date(latestWeight.recordedAt).toLocaleString() : "No entry"}</small></div>
          <div className="measurement-metric" title={methodLabel(latestWithBodyFat?.bodyFatMethod ?? null)}><span>Body fat estimate</span><strong>{formatValue(latestWithBodyFat?.bodyFat, "%")}</strong><small>{methodLabel(latestWithBodyFat?.bodyFatMethod ?? null)}</small></div>
          <div className="measurement-metric" title={methodLabel(latestWithRatio?.waistToHeightRatioMethod ?? null)}><span>Waist-to-height</span><strong>{latestWithRatio?.waistToHeightRatio?.toFixed(3) ?? "—"}</strong><small>{methodLabel(latestWithRatio?.waistToHeightRatioMethod ?? null)}</small></div>
          <div className="measurement-metric"><span>Lean mass</span><strong>{formatValue(latestWithComposition?.leanMass, displayUnits.weight)}</strong><small>Fat mass {formatValue(latestWithComposition?.fatMass, displayUnits.weight)}</small></div>
        </div>
        <div className="measurement-profile-context"><span><b>Height:</b> {formatValue(profileMetrics?.height, profileMetrics?.displayUnit ?? displayUnits.length)}</span><span><b>Calculation reference:</b> {profileMetrics?.bodyCompositionReference ? `${profileMetrics.bodyCompositionReference.toLowerCase()} reference` : "Not configured"}</span><span><b>Reference basis:</b> {profileMetrics?.bodyCompositionReferenceBasis ? profileMetrics.bodyCompositionReferenceBasis.replaceAll("_", " ").toLowerCase() : "Not configured"}</span></div>
      </article>

      <article id="measurement-session-entry" className="dashboard-card measurement-entry-card">
        <div className="measurement-section-heading"><div><span className="measurement-eyebrow">Body measurements</span><h2>Guided session</h2></div></div>
        <div className="measurement-mode-selector" role="group" aria-label="Measurement detail level">{(["NEWBIE", "NORMAL", "PRO"] as EntryMode[]).map((mode) => <button key={mode} type="button" className={entryMode === mode ? "active" : ""} onClick={() => setEntryMode(mode)}><strong>{mode === "NORMAL" ? "Standard" : mode.charAt(0) + mode.slice(1).toLowerCase()}</strong><span>{mode === "NEWBIE" ? "Essential inputs with guidance" : mode === "NORMAL" ? "Balanced weekly tracking" : "Complete bilateral detail"}</span></button>)}</div>
        <form className="measurement-wizard" onSubmit={handleSubmit}>
          <label className="measurement-date-field"><span>Observed at</span><input type="datetime-local" max={getLocalDateTimeValue()} value={measurementRecordedAt} onChange={(event) => setMeasurementRecordedAt(event.target.value)} required /></label>
          <div className="measurement-input-grid">{MODE_FIELDS[entryMode].map((field) => { const isPercent = field === "bodyFat"; const unit = isPercent ? "%" : displayUnits.length; return <label key={field} className="measurement-input"><span>{FIELD_LABELS[field]} <em>{unit}</em></span><input type="number" min="0" step={getMeasurementStep(unit as LengthUnit | "%")} value={formValues[field]} onChange={(event) => setField(field, event.target.value)} />{entryMode === "NEWBIE" && GUIDANCE[field] && <small>{GUIDANCE[field]}</small>}</label>; })}</div>
          <div className="measurement-calculation-note"><strong>Calculated automatically</strong><span>Body fat, fat mass, lean mass, and waist-to-height ratio are calculated when the required profile and circumference values are available. Daily weight remains in its own history.</span></div>
          <div className="measurement-form-actions"><button type="button" className="secondary-button" onClick={clearForm}>Clear</button><button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save session"}</button></div>
        </form>
      </article>
    </section>

    <section className="dashboard-card measurement-history-card">
      <div className="measurement-section-heading"><div><span className="measurement-eyebrow">History</span><h2>Body measurement sessions</h2></div><span className="measurement-record-count">{measurements.length} sessions</span></div>
      {isLoading ? <p>Loading measurements...</p> : measurements.length === 0 ? <div className="measurement-empty-state"><h3>No sessions yet</h3><p>Record weight separately or complete your first guided body-measurement session.</p></div> : <div className="measurement-table-wrap"><table className="measurement-table"><thead><tr><th>Observed at</th><th>Waist</th><th>Body fat</th><th>Waist / height</th><th>Lean mass</th><th>Method</th></tr></thead><tbody>{measurements.map((measurement) => { const units = measurement.displayUnits ?? displayUnits; return <tr key={measurement.id}><td><strong>{new Date(measurement.measurementDate).toLocaleString()}</strong></td><td>{formatValue(measurement.waist, units.length)}</td><td>{formatValue(measurement.bodyFat, "%")}</td><td>{measurement.waistToHeightRatio?.toFixed(3) ?? "—"}</td><td>{formatValue(measurement.leanMass, units.weight)}</td><td><span className="measurement-method-chip" title={`Body fat: ${methodLabel(measurement.bodyFatMethod)}. Waist-to-height: ${methodLabel(measurement.waistToHeightRatioMethod)}.`}>{measurement.bodyFatMethod ? "Calculated" : measurement.waistToHeightRatioMethod ? "Ratio only" : "Recorded"}</span></td></tr>; })}</tbody></table></div>}
    </section>
  </main>;
}
