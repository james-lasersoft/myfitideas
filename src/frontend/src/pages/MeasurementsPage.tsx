import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
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
type SessionField = Exclude<keyof CreateMeasurementInput, "weight" | "weightUnit" | "lengthUnit" | "measurementDate" | "confirmAnomaly" | "bodyFat">;

interface WizardStep {
  title: string;
  description: string;
  fields: SessionField[];
}

const FIELD_LABELS: Record<SessionField, string> = {
  waist: "Waist", chest: "Chest", hips: "Hips", neck: "Neck", abdomen: "Abdomen",
  leftBicep: "Left upper arm", rightBicep: "Right upper arm", leftForearm: "Left forearm",
  rightForearm: "Right forearm", leftThigh: "Left thigh", rightThigh: "Right thigh",
  leftCalf: "Left calf", rightCalf: "Right calf",
};

const GUIDANCE: Partial<Record<SessionField, string>> = {
  neck: "Place the tape just below the larynx. Keep it level and comfortably snug without compressing the skin.",
  chest: "Measure around the fullest part of the chest. Keep the tape parallel to the floor and breathe normally.",
  waist: "Measure at the natural waist or narrowest point of the torso after a normal exhale.",
  abdomen: "Measure level with the navel after a normal exhale. Keep the abdomen relaxed.",
  hips: "Measure around the widest point of the hips and glutes with feet together.",
  leftBicep: "Measure the midpoint of each relaxed upper arm using the same position on both sides.",
  leftForearm: "Measure around the widest part of each relaxed forearm.",
  leftThigh: "Measure around the widest part of each upper thigh while standing evenly.",
  leftCalf: "Measure around the widest part of each calf while standing evenly.",
};

const MODE_FIELDS: Record<EntryMode, SessionField[]> = {
  NEWBIE: ["neck", "chest", "waist", "abdomen", "hips", "leftBicep", "rightBicep", "leftForearm", "rightForearm", "leftThigh", "rightThigh", "leftCalf", "rightCalf"],
  NORMAL: ["neck", "chest", "waist", "abdomen", "hips", "leftBicep", "rightBicep", "leftThigh", "rightThigh"],
  PRO: ["neck", "chest", "waist", "abdomen", "hips", "leftBicep", "rightBicep", "leftForearm", "rightForearm", "leftThigh", "rightThigh", "leftCalf", "rightCalf"],
};

const NOVICE_STEPS: WizardStep[] = [
  { title: "Neck", description: GUIDANCE.neck ?? "", fields: ["neck"] },
  { title: "Chest", description: GUIDANCE.chest ?? "", fields: ["chest"] },
  { title: "Waist", description: GUIDANCE.waist ?? "", fields: ["waist"] },
  { title: "Abdomen", description: GUIDANCE.abdomen ?? "", fields: ["abdomen"] },
  { title: "Hips", description: GUIDANCE.hips ?? "", fields: ["hips"] },
  { title: "Upper arms", description: GUIDANCE.leftBicep ?? "", fields: ["leftBicep", "rightBicep"] },
  { title: "Forearms", description: GUIDANCE.leftForearm ?? "", fields: ["leftForearm", "rightForearm"] },
  { title: "Thighs", description: GUIDANCE.leftThigh ?? "", fields: ["leftThigh", "rightThigh"] },
  { title: "Calves", description: GUIDANCE.leftCalf ?? "", fields: ["leftCalf", "rightCalf"] },
];

const CORE_REVIEW_FIELDS: Array<{ field: SessionField; stepIndex: number }> = [
  { field: "neck", stepIndex: 0 },
  { field: "chest", stepIndex: 1 },
  { field: "waist", stepIndex: 2 },
  { field: "abdomen", stepIndex: 3 },
  { field: "hips", stepIndex: 4 },
];

const PAIRED_REVIEW_FIELDS: Array<{ title: string; left: SessionField; right: SessionField; stepIndex: number }> = [
  { title: "Upper arms", left: "leftBicep", right: "rightBicep", stepIndex: 5 },
  { title: "Forearms", left: "leftForearm", right: "rightForearm", stepIndex: 6 },
  { title: "Thighs", left: "leftThigh", right: "rightThigh", stepIndex: 7 },
  { title: "Calves", left: "leftCalf", right: "rightCalf", stepIndex: 8 },
];

const MODE_DESCRIPTIONS: Record<EntryMode, string> = {
  NEWBIE: "One guided step at a time with paired left and right measurements.",
  NORMAL: "Balanced weekly tracking with grouped measurements.",
  PRO: "Complete bilateral detail with minimal guidance.",
};

function getLocalDateTimeValue(date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
function optionalNumber(value: string): number | undefined { return value.trim() === "" ? undefined : Number(value); }
function methodLabel(method: string | null): string {
  if (!method) return "Not calculated";
  if (method === "US_NAVY_CIRCUMFERENCE") return "U.S. Navy circumference estimate";
  if (method === "WAIST_CM_DIVIDED_BY_HEIGHT_CM") return "Waist divided by height";
  if (method === "USER_PROVIDED") return "User provided";
  return method.replaceAll("_", " ").toLowerCase();
}
function formatValue(value: number | null | undefined, unit = ""): string {
  if (value == null) return "—";
  return `${formatMeasurement(value, unit as WeightUnit | LengthUnit | "%")} ${unit}`.trim();
}
function modeLabel(mode: EntryMode): string {
  if (mode === "NEWBIE") return "Novice";
  if (mode === "NORMAL") return "Standard";
  return "Advanced";
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
  const modalRef = useRef<HTMLElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const measurementInputRefs = useRef<Partial<Record<SessionField, HTMLInputElement | null>>>({});
  const reviewReadyRef = useRef(false);
  const [weights, setWeights] = useState<BodyWeight[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [profileMetrics, setProfileMetrics] = useState<MeasurementProfileMetrics | null>(null);
  const [displayUnits, setDisplayUnits] = useState<MeasurementDisplayUnits>(DEFAULT_DISPLAY_UNITS);
  const [entryMode, setEntryMode] = useState<EntryMode>("NEWBIE");
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("weight");
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [noviceStep, setNoviceStep] = useState(0);
  const [measurementDate, setMeasurementDate] = useState(getLocalDateTimeValue());
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

  useEffect(() => {
    if (!isSessionActive) return;
    const previousOverflow = document.body.style.overflow;
    const modal = modalRef.current;
    modal?.focus();
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && !isSaving) {
        setIsSessionActive(false);
        return;
      }
      if (event.key !== "Tab" || !modal) return;
      const focusable = Array.from(modal.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])"));
      if (focusable.length === 0) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", handleKeyDown); };
  }, [isSaving, isSessionActive]);

  const latestWeight = weights[0] ?? null;
  const latestSession = measurements[0] ?? null;
  const latestWithBodyFat = measurements.find((item) => item.bodyFat != null) ?? null;
  const latestWithRatio = measurements.find((item) => item.waistToHeightRatio != null) ?? null;
  const latestWithComposition = measurements.find((item) => item.fatMass != null || item.leanMass != null) ?? null;
  const isNoviceReview = noviceStep === NOVICE_STEPS.length;
  const currentNoviceStep = NOVICE_STEPS[Math.min(noviceStep, NOVICE_STEPS.length - 1)];
  const skippedReviewFields = MODE_FIELDS.NEWBIE.filter((field) => !formValues[field]);

  useEffect(() => {
    if (!isSessionActive || entryMode !== "NEWBIE") return;
    if (isNoviceReview) {
      stepHeadingRef.current?.focus();
      return;
    }
    const firstField = currentNoviceStep.fields[0];
    requestAnimationFrame(() => {
      if (firstField) measurementInputRefs.current[firstField]?.focus();
    });
  }, [currentNoviceStep, entryMode, isNoviceReview, isSessionActive, noviceStep]);

  const trend = useMemo(() => {
    if (trendMetric === "weight") return { label: "Weight", unit: displayUnits.weight, points: weights.slice().reverse().map((item) => ({ date: item.recordedAt, value: item.weight })) };
    const unit = trendMetric === "bodyFat" ? "%" : trendMetric === "waist" ? displayUnits.length : "";
    return { label: trendMetric, unit, points: measurements.slice().reverse().map((item) => ({ date: item.measurementDate, value: item[trendMetric] as number | null })).filter((point): point is TrendPoint => point.value != null) };
  }, [displayUnits, measurements, trendMetric, weights]);

  const setField = (field: SessionField, value: string): void => setFormValues((current) => ({ ...current, [field]: value }));
  const clearForm = (): void => {
    reviewReadyRef.current = false;
    setFormValues(Object.fromEntries(Object.keys(FIELD_LABELS).map((key) => [key, ""])) as Record<SessionField, string>);
    setMeasurementDate(getLocalDateTimeValue()); setNoviceStep(0);
  };
  const startSession = (): void => { setMessage(""); setError(""); clearForm(); setIsSessionActive(true); };
  const cancelSession = (): void => { if (isSaving) return; clearForm(); setError(""); setIsSessionActive(false); };

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
    const weight = optionalNumber(weightValue); const observedAt = new Date(weightRecordedAt);
    if (weight === undefined || !Number.isFinite(weight) || weight <= 0) { setError("Enter a valid positive weight."); return; }
    if (Number.isNaN(observedAt.getTime())) { setError("Enter a valid observation date and time."); return; }
    setIsSavingWeight(true);
    try {
      await createBodyWeight({ weight, unit: displayUnits.weight, recordedAt: observedAt.toISOString(), timezoneOffsetMinutes: observedAt.getTimezoneOffset() });
      await refreshMeasurements(); setWeightValue(""); setWeightRecordedAt(getLocalDateTimeValue()); setMessage("Weight observation saved. A same-day manual entry is replaced rather than duplicated.");
    } catch (caught) { setError(getBodyWeightError(caught)); }
    finally { setIsSavingWeight(false); }
  };

  const validateNoviceFields = (fields: SessionField[]): boolean => {
    const invalidField = fields.find((field) => {
      const value = optionalNumber(formValues[field]);
      return value !== undefined && (!Number.isFinite(value) || value <= 0);
    });
    if (!invalidField) return true;
    setError(`${FIELD_LABELS[invalidField]} must be a positive number or left blank.`);
    requestAnimationFrame(() => measurementInputRefs.current[invalidField]?.focus());
    return false;
  };

  const advanceNovice = (): void => {
    setError("");
    if (isNoviceReview) return;
    if (!validateNoviceFields(currentNoviceStep.fields)) return;
    if (noviceStep === NOVICE_STEPS.length - 1) reviewReadyRef.current = false;
    setNoviceStep((step) => Math.min(step + 1, NOVICE_STEPS.length));
  };

  const editNoviceStep = (stepIndex: number): void => {
    reviewReadyRef.current = false;
    setError("");
    setNoviceStep(stepIndex);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (entryMode === "NEWBIE" && !isNoviceReview) {
      advanceNovice();
      return;
    }
    if (entryMode === "NEWBIE" && !reviewReadyRef.current) {
      reviewReadyRef.current = true;
      return;
    }
    setMessage(""); setError("");
    const observedAt = new Date(measurementDate);
    if (Number.isNaN(observedAt.getTime())) { setError("Enter a valid session observation date and time."); return; }
    const visibleFields = MODE_FIELDS[entryMode];
    const input = visibleFields.reduce<CreateMeasurementInput>((result, field) => { const value = optionalNumber(formValues[field]); if (value !== undefined) result[field] = value; return result; }, { lengthUnit: displayUnits.length, measurementDate: observedAt.toISOString() });
    const supplied = visibleFields.filter((field) => input[field] !== undefined);
    if (supplied.length === 0) { setError("Enter at least one body measurement."); return; }
    if (supplied.some((field) => !Number.isFinite(input[field]) || Number(input[field]) <= 0)) { setError("Measurement values must be positive numbers."); return; }
    setIsSaving(true);
    try { await submitMeasurement(input); await refreshMeasurements(); clearForm(); setIsSessionActive(false); setMessage("Body measurement session saved successfully."); }
    catch (caught) { setError(caught instanceof Error && caught.message === "ENTRY_REVIEW_REQUESTED" ? "Measurement was not saved." : getMeasurementError(caught)); }
    finally { setIsSaving(false); }
  };

  const skipNoviceStep = (): void => {
    currentNoviceStep.fields.forEach((field) => setField(field, ""));
    if (noviceStep === NOVICE_STEPS.length - 1) reviewReadyRef.current = false;
    setError(""); setNoviceStep((step) => Math.min(step + 1, NOVICE_STEPS.length));
  };

  const handleNoviceInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>, field: SessionField): void => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    const fieldIndex = currentNoviceStep.fields.indexOf(field);
    if (fieldIndex < 0) return;
    const nextField = currentNoviceStep.fields[fieldIndex + 1];
    if (nextField) {
      if (!validateNoviceFields([field])) return;
      measurementInputRefs.current[nextField]?.focus();
      return;
    }
    advanceNovice();
  };

  const renderMeasurementInput = (field: SessionField, useGuidedKeyboard = false) => <label key={field} className="measurement-input">
    <span>{FIELD_LABELS[field]} <em>{displayUnits.length}</em></span>
    <input
      ref={(element) => { measurementInputRefs.current[field] = element; }}
      type="number"
      min="0"
      step={getMeasurementStep(displayUnits.length)}
      value={formValues[field]}
      onChange={(event) => setField(field, event.target.value)}
      onKeyDown={useGuidedKeyboard ? (event) => handleNoviceInputKeyDown(event, field) : undefined}
      inputMode="decimal"
      aria-describedby={useGuidedKeyboard ? "novice-enter-instruction" : undefined}
    />
  </label>;

  return <main className="dashboard-page measurements-page">
    <header className="dashboard-header page-brand-header measurements-header">
      <div className="page-brand-heading"><BrandLogo variant="symbol" className="page-brand-symbol" /><div><h1>Body Measurements</h1><p>Record daily weight separately from guided body-measurement sessions.</p></div></div>
      <div className="measurements-header-actions"><button type="button" className="secondary-button" onClick={() => navigate("/dashboard")}>Back to Dashboard</button></div>
    </header>
    {error && !isSessionActive && <div className="measurement-banner measurement-banner-error" role="alert">{error}</div>}
    {message && <div className="measurement-banner measurement-banner-success" role="status" aria-live="polite">{message}</div>}

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
        <div className="measurement-section-heading"><div><span className="measurement-eyebrow">Body measurements</span><h2>Latest measurement session</h2></div></div>
        <div className="measurement-session-summary"><strong>{latestSession ? new Date(latestSession.measurementDate).toLocaleString() : "No session yet"}</strong><span>{latestSession ? "Latest completed session" : "Complete your first circumference session"}</span></div>
        <button type="button" className="measurement-session-jump" onClick={startSession}>Start measurement session</button>
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
    </section>

    <section className="dashboard-card measurement-history-card">
      <div className="measurement-section-heading"><div><span className="measurement-eyebrow">History</span><h2>Body measurement sessions</h2></div><span className="measurement-record-count">{measurements.length} sessions</span></div>
      {isLoading ? <p>Loading measurements...</p> : measurements.length === 0 ? <div className="measurement-empty-state"><h3>No sessions yet</h3><p>Record weight separately or complete your first guided body-measurement session.</p></div> : <div className="measurement-table-wrap"><table className="measurement-table"><thead><tr><th>Observed at</th><th>Waist</th><th>Body fat</th><th>Waist / height</th><th>Lean mass</th><th>Method</th></tr></thead><tbody>{measurements.map((measurement) => { const units = measurement.displayUnits ?? displayUnits; return <tr key={measurement.id}><td><strong>{new Date(measurement.measurementDate).toLocaleString()}</strong></td><td>{formatValue(measurement.waist, units.length)}</td><td>{formatValue(measurement.bodyFat, "%")}</td><td>{measurement.waistToHeightRatio?.toFixed(3) ?? "—"}</td><td>{formatValue(measurement.leanMass, units.weight)}</td><td><span className="measurement-method-chip" title={`Body fat: ${methodLabel(measurement.bodyFatMethod)}. Waist-to-height: ${methodLabel(measurement.waistToHeightRatioMethod)}.`}>{measurement.bodyFatMethod ? "Calculated" : measurement.waistToHeightRatioMethod ? "Ratio only" : "Recorded"}</span></td></tr>; })}</tbody></table></div>}
    </section>

    {isSessionActive && <div className="measurement-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) cancelSession(); }}>
      <section ref={modalRef} tabIndex={-1} className="measurement-modal" role="dialog" aria-modal="true" aria-labelledby="measurement-modal-title" aria-describedby="measurement-modal-description">
        <header className="measurement-modal-header">
          <div><span className="measurement-eyebrow">Active session</span><h2 id="measurement-modal-title">Body measurement session</h2><p id="measurement-modal-description">Observed {new Date(measurementDate).toLocaleString()}</p></div>
          <button type="button" className="measurement-modal-close" onClick={cancelSession} disabled={isSaving} aria-label="Close measurement session">×</button>
        </header>
        <div className="measurement-modal-body">
          {error && <div className="measurement-banner measurement-banner-error" role="alert">{error}</div>}
          <div className="measurement-modal-controls">
            <div><strong>Entry experience</strong><span>{MODE_DESCRIPTIONS[entryMode]}</span></div>
            <div className="measurement-mode-selector measurement-mode-segmented" role="group" aria-label="Measurement guidance level">{(["NEWBIE", "NORMAL", "PRO"] as EntryMode[]).map((mode) => <button key={mode} type="button" className={entryMode === mode ? "active" : ""} onClick={() => { reviewReadyRef.current = false; setEntryMode(mode); setNoviceStep(0); setError(""); }} aria-pressed={entryMode === mode}>{modeLabel(mode)}</button>)}</div>
          </div>
          <form id="measurement-session-form" className="measurement-wizard" onSubmit={handleSubmit}>
            <label className="measurement-date-field"><span>Observed at</span><input type="datetime-local" max={getLocalDateTimeValue()} value={measurementDate} onChange={(event) => setMeasurementDate(event.target.value)} required /></label>
            {entryMode === "NEWBIE" ? <div className="novice-wizard">
              <div className="novice-progress" aria-label={`Step ${Math.min(noviceStep + 1, NOVICE_STEPS.length + 1)} of ${NOVICE_STEPS.length + 1}`}>
                <span>Step {Math.min(noviceStep + 1, NOVICE_STEPS.length + 1)} of {NOVICE_STEPS.length + 1}</span>
                <progress value={noviceStep + 1} max={NOVICE_STEPS.length + 1} />
              </div>
              <div className="sr-only" aria-live="polite">{isNoviceReview ? "Review measurements" : `${currentNoviceStep.title}. Step ${noviceStep + 1} of ${NOVICE_STEPS.length + 1}`}</div>
              <p id="novice-enter-instruction" className="sr-only">Press Enter to continue. For paired measurements, Enter moves from the left field to the right field before continuing.</p>
              {isNoviceReview ? <section className="novice-review" aria-labelledby="novice-step-heading">
                <h3 id="novice-step-heading" ref={stepHeadingRef} tabIndex={-1}>Review your measurements</h3>
                <p>Confirm the observation time and every captured value before saving. Use an Edit button to return directly to that measurement step.</p>

                <section aria-labelledby="review-session-details">
                  <h4 id="review-session-details">Session details</h4>
                  <dl><div><dt>Observed at</dt><dd>{new Date(measurementDate).toLocaleString()}</dd></div><div><dt>Entry experience</dt><dd>{modeLabel(entryMode)}</dd></div><div><dt>Measurement unit</dt><dd>{displayUnits.length}</dd></div></dl>
                </section>

                <section aria-labelledby="review-core-measurements">
                  <h4 id="review-core-measurements">Core measurements</h4>
                  <dl>{CORE_REVIEW_FIELDS.map(({ field, stepIndex }) => <div key={field}><dt>{FIELD_LABELS[field]}</dt><dd>{formValues[field] ? `${formValues[field]} ${displayUnits.length}` : "Not entered"}</dd><dd><button type="button" className="secondary-button" onClick={() => editNoviceStep(stepIndex)} aria-label={`Edit ${FIELD_LABELS[field]}`}>Edit</button></dd></div>)}</dl>
                </section>

                <section aria-labelledby="review-paired-measurements">
                  <h4 id="review-paired-measurements">Paired measurements</h4>
                  <dl>{PAIRED_REVIEW_FIELDS.map(({ title, left, right, stepIndex }) => {
                    const leftValue = optionalNumber(formValues[left]);
                    const rightValue = optionalNumber(formValues[right]);
                    const difference = leftValue !== undefined && rightValue !== undefined ? Math.abs(leftValue - rightValue) : null;
                    return <div key={title}><dt>{title}</dt><dd>Left: {formValues[left] ? `${formValues[left]} ${displayUnits.length}` : "Not entered"}</dd><dd>Right: {formValues[right] ? `${formValues[right]} ${displayUnits.length}` : "Not entered"}</dd>{difference !== null && <dd>Difference: {difference.toFixed(1)} {displayUnits.length}</dd>}<dd><button type="button" className="secondary-button" onClick={() => editNoviceStep(stepIndex)} aria-label={`Edit ${title}`}>Edit</button></dd></div>;
                  })}</dl>
                </section>

                <section aria-labelledby="review-skipped-measurements">
                  <h4 id="review-skipped-measurements">Skipped measurements</h4>
                  {skippedReviewFields.length === 0 ? <p>None. Every measurement was entered.</p> : <ul>{skippedReviewFields.map((field) => <li key={field}>{FIELD_LABELS[field]}: Not entered</li>)}</ul>}
                </section>

                <section aria-labelledby="review-calculated-results">
                  <h4 id="review-calculated-results">Calculated after saving</h4>
                  <ul><li>Body fat estimate, when required profile and circumference data are available</li><li>Lean mass and fat mass, when body fat and a nearby weight observation are available</li><li>Waist-to-height ratio, when waist and height are available</li></ul>
                </section>
              </section> : <section className="novice-step" aria-labelledby="novice-step-heading">
                <h3 id="novice-step-heading" ref={stepHeadingRef} tabIndex={-1}>{currentNoviceStep.title}</h3>
                <p>{currentNoviceStep.description}</p>
                <fieldset><legend>{currentNoviceStep.fields.length === 2 ? `${currentNoviceStep.title}: left and right` : currentNoviceStep.title}</legend><div className={currentNoviceStep.fields.length === 2 ? "measurement-pair-grid" : "measurement-single-grid"}>{currentNoviceStep.fields.map((field) => renderMeasurementInput(field, true))}</div></fieldset>
              </section>}
            </div> : <div className="measurement-input-grid">{MODE_FIELDS[entryMode].map((field) => renderMeasurementInput(field))}</div>}
            <div className="measurement-calculation-note"><strong>Calculated automatically</strong><span>Body fat, fat mass, lean mass, and waist-to-height ratio are derived after saving when required profile and circumference values are available. Body fat is not entered manually in this workflow.</span></div>
          </form>
        </div>
        <footer className="measurement-modal-footer">
          <button type="button" className="secondary-button" onClick={cancelSession} disabled={isSaving}>Cancel</button>
          {entryMode === "NEWBIE" ? <>
            <button type="button" className="secondary-button" onClick={() => { reviewReadyRef.current = false; setNoviceStep((step) => Math.max(0, step - 1)); }} disabled={isSaving || noviceStep === 0}>Back</button>
            {!isNoviceReview && <button type="button" className="secondary-button" onClick={skipNoviceStep} disabled={isSaving}>Skip</button>}
            {isNoviceReview ? <button type="submit" form="measurement-session-form" disabled={isSaving}>{isSaving ? "Saving..." : "Save session"}</button> : <button type="button" onClick={advanceNovice} disabled={isSaving}>Next</button>}
          </> : <button type="submit" form="measurement-session-form" disabled={isSaving}>{isSaving ? "Saving..." : "Save session"}</button>}
        </footer>
      </section>
    </div>}
  </main>;
}
