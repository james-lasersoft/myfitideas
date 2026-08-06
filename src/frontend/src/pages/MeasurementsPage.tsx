import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import MeasurementSessionModal from "../components/measurements/MeasurementSessionModal";
import { FIELD_LABELS, getLocalDateTimeValue, optionalNumber, type SessionField } from "../components/measurements/measurementSessionModel";
import { useLocale } from "../i18n/LocaleContext";
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
type TrendMetric = "weight" | "bodyFat" | "waistToHeightRatio" | "waist";
const TREND_LABELS: Record<TrendMetric, string> = {
  weight: "Weight",
  bodyFat: "Body fat",
  waistToHeightRatio: "Waist-to-height",
  waist: "Waist",
};

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
function referenceLabel(reference: MeasurementProfileMetrics["bodyCompositionReference"]): string {
  if (reference === "MALE") return "male reference";
  if (reference === "FEMALE") return "female reference";
  return "Not configured";
}
function referenceBasisLabel(basis: MeasurementProfileMetrics["bodyCompositionReferenceBasis"]): string {
  if (basis === "BIRTH_SEX") return "birth sex";
  if (basis === "HORMONE_THERAPY") return "hormone therapy";
  return "Not configured";
}

interface TrendPoint { date: string; value: number; }
function MiniTrendChart({ points, label, unit }: { points: TrendPoint[]; label: string; unit: string }) {
  const { locale, t } = useLocale();
  const visible = points.slice(-16);
  if (visible.length < 2) return <div className="measurement-chart-empty">{t("Add at least two entries to see a trend.")}</div>;
  const values = visible.map((point) => point.value);
  const min = Math.min(...values); const max = Math.max(...values); const span = Math.max(max - min, 0.01);
  const coordinates = visible.map((point, index) => ({ x: 20 + (index / Math.max(visible.length - 1, 1)) * 560, y: 180 - ((point.value - min) / span) * 140 }));
  return <div className="measurement-chart-wrap">
    <svg className="measurement-chart" viewBox="0 0 600 210" role="img" aria-label={`${label} ${t("trend chart")}`}>
      <line x1="20" x2="580" y1="180" y2="180" className="measurement-chart-axis" />
      <line x1="20" x2="580" y1="40" y2="40" className="measurement-chart-grid" />
      <line x1="20" x2="580" y1="110" y2="110" className="measurement-chart-grid" />
      <polyline points={coordinates.map((point) => `${point.x},${point.y}`).join(" ")} className="measurement-chart-line" />
      {visible.map((point, index) => <circle key={`${point.date}-${index}`} cx={coordinates[index].x} cy={coordinates[index].y} r="4" className="measurement-chart-point"><title>{`${new Date(point.date).toLocaleString(locale)}: ${formatValue(point.value, unit)}`}</title></circle>)}
    </svg>
    <div className="measurement-chart-range"><span>{formatValue(min, unit)}</span><span>{formatValue(max, unit)}</span></div>
  </div>;
}

export default function MeasurementsPage() {
  const navigate = useNavigate();
  const { locale, t } = useLocale();
  const [weights, setWeights] = useState<BodyWeight[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [profileMetrics, setProfileMetrics] = useState<MeasurementProfileMetrics | null>(null);
  const [displayUnits, setDisplayUnits] = useState<MeasurementDisplayUnits>(DEFAULT_DISPLAY_UNITS);
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("weight");
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [weightRecordedAt, setWeightRecordedAt] = useState(getLocalDateTimeValue());
  const [weightValue, setWeightValue] = useState("");
  const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true); const [isSavingWeight, setIsSavingWeight] = useState(false);

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
    const label = t(TREND_LABELS[trendMetric]);
    if (trendMetric === "weight") return { label, unit: displayUnits.weight, points: weights.slice().reverse().map((item) => ({ date: item.recordedAt, value: item.weight })) };
    const unit = trendMetric === "bodyFat" ? "%" : trendMetric === "waist" ? displayUnits.length : "";
    return { label, unit, points: measurements.slice().reverse().map((item) => ({ date: item.measurementDate, value: item[trendMetric] as number | null })).filter((point): point is TrendPoint => point.value != null) };
  }, [displayUnits, measurements, t, trendMetric, weights]);

  const startSession = (): void => { setMessage(""); setError(""); setIsSessionActive(true); };

  const submitMeasurement = async (input: CreateMeasurementInput): Promise<void> => {
    try { await createMeasurement(input); }
    catch (caught) {
      const guardrail = getMeasurementGuardrail(caught); if (!guardrail) throw caught;
      const details = guardrail.issues.map((issue) => {
        const field = FIELD_LABELS[issue.field as SessionField] ?? issue.field;
        return `${t(field)}: ${t(issue.message)}`;
      }).join("\n");
      if (!window.confirm(`${t(guardrail.message)}\n\n${details}\n\n${t("Save this entry as confirmed?")}`)) throw new Error("ENTRY_REVIEW_REQUESTED", { cause: caught });
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

  const handleSessionSave = async (input: CreateMeasurementInput): Promise<void> => {
    setMessage("");
    setError("");
    try {
      await submitMeasurement(input);
      await refreshMeasurements();
      setIsSessionActive(false);
      setMessage("Body measurement session saved successfully.");
    } catch (caught) {
      throw new Error(caught instanceof Error && caught.message === "ENTRY_REVIEW_REQUESTED" ? "Measurement was not saved." : getMeasurementError(caught), { cause: caught });
    }
  };

  return <main className="dashboard-page measurements-page">
    <header className="dashboard-header page-brand-header measurements-header">
      <div className="page-brand-heading"><BrandLogo variant="symbol" className="page-brand-symbol" /><div><h1>{t("Body Measurements")}</h1><p>{t("Record daily weight separately from guided body-measurement sessions.")}</p></div></div>
      <div className="measurements-header-actions"><button type="button" className="secondary-button" onClick={() => navigate("/dashboard")}>{t("Back to Dashboard")}</button></div>
    </header>
    {error && !isSessionActive && <div className="measurement-banner measurement-banner-error" role="alert">{t(error)}</div>}
    {message && <div className="measurement-banner measurement-banner-success" role="status" aria-live="polite">{t(message)}</div>}

    <section className="measurement-quick-actions">
      <article className="dashboard-card daily-weight-card">
        <div className="measurement-section-heading"><div><span className="measurement-eyebrow">{t("Daily check-in")}</span><h2>{t("Today's weight")}</h2></div></div>
        <div className="daily-weight-summary"><strong>{formatValue(latestWeight?.weight, displayUnits.weight)}</strong><span>{latestWeight ? `${t("Last recorded")} ${new Date(latestWeight.recordedAt).toLocaleString(locale)}` : t("No weight recorded yet")}</span></div>
        <form className="daily-weight-form" onSubmit={handleWeightSubmit}>
          <label><span>{t("Weight")} <em>{displayUnits.weight}</em></span><input type="number" min="0" step={getMeasurementStep(displayUnits.weight)} value={weightValue} onChange={(event) => setWeightValue(event.target.value)} /></label>
          <label><span>{t("Observed at")}</span><input type="datetime-local" max={getLocalDateTimeValue()} value={weightRecordedAt} onChange={(event) => setWeightRecordedAt(event.target.value)} required /></label>
          <button type="submit" disabled={isSavingWeight}>{isSavingWeight ? t("Saving...") : t("Record weight")}</button>
        </form>
      </article>

      <article className="dashboard-card measurement-session-summary-card">
        <div className="measurement-section-heading"><div><span className="measurement-eyebrow">{t("Body measurements")}</span><h2>{t("Latest measurement session")}</h2></div></div>
        <div className="measurement-session-summary"><strong>{latestSession ? new Date(latestSession.measurementDate).toLocaleString(locale) : t("No session yet")}</strong><span>{latestSession ? t("Latest completed session") : t("Complete your first circumference session")}</span></div>
        <button type="button" className="measurement-session-jump" onClick={startSession}>{t("Start measurement session")}</button>
      </article>
    </section>

    <section className="measurements-top-grid">
      <article className="dashboard-card measurement-insights-card">
        <div className="measurement-section-heading"><div><span className="measurement-eyebrow">{t("Progress overview")}</span><h2>{t("Body transformation metrics")}</h2></div><select value={trendMetric} onChange={(event) => setTrendMetric(event.target.value as TrendMetric)} aria-label={t("Trend metric")}><option value="weight">{t("Weight")}</option><option value="bodyFat">{t("Body fat")}</option><option value="waistToHeightRatio">{t("Waist-to-height")}</option><option value="waist">{t("Waist")}</option></select></div>
        <MiniTrendChart points={trend.points} label={trend.label} unit={trend.unit} />
        <div className="measurement-metric-grid">
          <div className="measurement-metric"><span>{t("Latest weight")}</span><strong>{formatValue(latestWeight?.weight, displayUnits.weight)}</strong><small>{latestWeight ? new Date(latestWeight.recordedAt).toLocaleString(locale) : t("No entry")}</small></div>
          <div className="measurement-metric" title={t(methodLabel(latestWithBodyFat?.bodyFatMethod ?? null))}><span>{t("Body fat estimate")}</span><strong>{formatValue(latestWithBodyFat?.bodyFat, "%")}</strong><small>{t(methodLabel(latestWithBodyFat?.bodyFatMethod ?? null))}</small></div>
          <div className="measurement-metric" title={t(methodLabel(latestWithRatio?.waistToHeightRatioMethod ?? null))}><span>{t("Waist-to-height")}</span><strong>{latestWithRatio?.waistToHeightRatio?.toFixed(3) ?? "—"}</strong><small>{t(methodLabel(latestWithRatio?.waistToHeightRatioMethod ?? null))}</small></div>
          <div className="measurement-metric"><span>{t("Lean mass")}</span><strong>{formatValue(latestWithComposition?.leanMass, displayUnits.weight)}</strong><small>{t("Fat mass")} {formatValue(latestWithComposition?.fatMass, displayUnits.weight)}</small></div>
        </div>
        <div className="measurement-profile-context"><span><b>{t("Height:")}</b> {formatValue(profileMetrics?.height, profileMetrics?.displayUnit ?? displayUnits.length)}</span><span><b>{t("Calculation reference:")}</b> {t(referenceLabel(profileMetrics?.bodyCompositionReference ?? null))}</span><span><b>{t("Reference basis:")}</b> {t(referenceBasisLabel(profileMetrics?.bodyCompositionReferenceBasis ?? null))}</span></div>
      </article>
    </section>

    <section className="dashboard-card measurement-history-card">
      <div className="measurement-section-heading"><div><span className="measurement-eyebrow">{t("History")}</span><h2>{t("Body measurement sessions")}</h2></div><span className="measurement-record-count">{measurements.length} {t(measurements.length === 1 ? "session" : "sessions")}</span></div>
      {isLoading ? <p>{t("Loading measurements...")}</p> : measurements.length === 0 ? <div className="measurement-empty-state"><h3>{t("No sessions yet")}</h3><p>{t("Record weight separately or complete your first guided body-measurement session.")}</p></div> : <div className="measurement-table-wrap"><table className="measurement-table"><thead><tr><th>{t("Observed at")}</th><th>{t("Waist")}</th><th>{t("Body fat")}</th><th>{t("Waist / height")}</th><th>{t("Lean mass")}</th><th>{t("Method")}</th></tr></thead><tbody>{measurements.map((measurement) => { const units = measurement.displayUnits ?? displayUnits; return <tr key={measurement.id}><td><strong>{new Date(measurement.measurementDate).toLocaleString(locale)}</strong></td><td>{formatValue(measurement.waist, units.length)}</td><td>{formatValue(measurement.bodyFat, "%")}</td><td>{measurement.waistToHeightRatio?.toFixed(3) ?? "—"}</td><td>{formatValue(measurement.leanMass, units.weight)}</td><td><span className="measurement-method-chip" title={`${t("Body fat")}: ${t(methodLabel(measurement.bodyFatMethod))}. ${t("Waist-to-height")}: ${t(methodLabel(measurement.waistToHeightRatioMethod))}.`}>{t(measurement.bodyFatMethod ? "Calculated" : measurement.waistToHeightRatioMethod ? "Ratio only" : "Recorded")}</span></td></tr>; })}</tbody></table></div>}
    </section>

    <MeasurementSessionModal
      isOpen={isSessionActive}
      lengthUnit={displayUnits.length}
      onCancel={() => setIsSessionActive(false)}
      onSave={handleSessionSave}
    />
  </main>;
}
