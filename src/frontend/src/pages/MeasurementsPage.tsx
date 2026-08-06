import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import BodyTransformationInsights from "../components/measurements/BodyTransformationInsights";
import MeasurementComparisonModal from "../components/measurements/MeasurementComparisonModal";
import MeasurementHistoryTable from "../components/measurements/MeasurementHistoryTable";
import MeasurementSessionDetailModal from "../components/measurements/MeasurementSessionDetailModal";
import MeasurementSessionModal from "../components/measurements/MeasurementSessionModal";
import { FIELD_LABELS, formatMeasurementValue, getLocalDateTimeValue, optionalNumber, type SessionField } from "../components/measurements/measurementSessionModel";
import { useLocale } from "../i18n/LocaleContext";
import { createBodyWeight, getBodyWeightError, type BodyWeight } from "../services/bodyWeightService";
import {
  createMeasurement,
  getMeasurementComparison,
  getMeasurementComparisonError,
  getMeasurementData,
  getMeasurementError,
  getMeasurementGuardrail,
  type CreateMeasurementInput,
  type Measurement,
  type MeasurementDisplayUnits,
  type MeasurementSessionComparison,
} from "../services/measurementService";
import {
  getBodyTransformationAnalytics,
  getBodyTransformationAnalyticsError,
  type AnalyticsPeriod,
  type AnalyticsQuery,
  type BodyTransformationAnalytics,
} from "../services/bodyTransformationService";
import { getMeasurementStep } from "../utils/measurementFormat";
import "./MeasurementsPage.css";

const DEFAULT_DISPLAY_UNITS: MeasurementDisplayUnits = { weight: "lb", length: "in" };
export default function MeasurementsPage() {
  const navigate = useNavigate();
  const { locale, t } = useLocale();
  const [weights, setWeights] = useState<BodyWeight[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [displayUnits, setDisplayUnits] = useState<MeasurementDisplayUnits>(DEFAULT_DISPLAY_UNITS);
  const [analytics, setAnalytics] = useState<BodyTransformationAnalytics | null>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>("LAST_30_DAYS");
  const [analyticsQuery, setAnalyticsQuery] = useState<AnalyticsQuery>({ period: "LAST_30_DAYS" });
  const [analyticsStartDate, setAnalyticsStartDate] = useState("");
  const [analyticsEndDate, setAnalyticsEndDate] = useState("");
  const [analyticsError, setAnalyticsError] = useState("");
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true);
  const [analyticsRevision, setAnalyticsRevision] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Measurement | null>(null);
  const detailTriggerRef = useRef<HTMLTableRowElement | null>(null);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [baselineSessionId, setBaselineSessionId] = useState("");
  const [comparisonSessionId, setComparisonSessionId] = useState("");
  const [sessionComparison, setSessionComparison] = useState<MeasurementSessionComparison | null>(null);
  const [isComparisonLoading, setIsComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState("");
  const comparisonTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [weightRecordedAt, setWeightRecordedAt] = useState(getLocalDateTimeValue());
  const [weightValue, setWeightValue] = useState("");
  const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true); const [isSavingWeight, setIsSavingWeight] = useState(false);

  const applyData = (data: Awaited<ReturnType<typeof getMeasurementData>>): void => {
    setWeights(data.weights); setMeasurements(data.measurementSessions);
    setDisplayUnits({ weight: data.weights[0]?.displayUnit ?? data.measurementSessions[0]?.displayUnits?.weight ?? "lb", length: data.profileMetrics.displayUnit });
  };
  const refreshMeasurements = async (): Promise<void> => {
    applyData(await getMeasurementData());
    setIsAnalyticsLoading(true);
    setAnalyticsError("");
    setAnalyticsRevision((revision) => revision + 1);
  };

  useEffect(() => {
    let cancelled = false;
    getMeasurementData().then((data) => { if (!cancelled) applyData(data); })
      .catch(() => { if (!cancelled) setError("Unable to load body transformation data."); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getBodyTransformationAnalytics(analyticsQuery)
      .then((result) => { if (!cancelled) setAnalytics(result); })
      .catch((caught) => {
        if (!cancelled) {
          setAnalytics(null);
          setAnalyticsError(getBodyTransformationAnalyticsError(caught));
        }
      })
      .finally(() => { if (!cancelled) setIsAnalyticsLoading(false); });
    return () => { cancelled = true; };
  }, [analyticsQuery, analyticsRevision]);

  useEffect(() => {
    if (!isComparisonOpen || !baselineSessionId || !comparisonSessionId || baselineSessionId === comparisonSessionId) return;
    let cancelled = false;
    getMeasurementComparison(baselineSessionId, comparisonSessionId)
      .then((result) => { if (!cancelled) setSessionComparison(result); })
      .catch((caught) => { if (!cancelled) setComparisonError(getMeasurementComparisonError(caught)); })
      .finally(() => { if (!cancelled) setIsComparisonLoading(false); });
    return () => { cancelled = true; };
  }, [baselineSessionId, comparisonSessionId, isComparisonOpen]);

  const latestWeight = weights[0] ?? null;
  const latestSession = measurements[0] ?? null;

  const changeAnalyticsPeriod = (period: AnalyticsPeriod): void => {
    setAnalyticsPeriod(period);
    if (period !== "CUSTOM") {
      setIsAnalyticsLoading(true);
      setAnalyticsError("");
      setAnalyticsQuery({ period });
    }
  };
  const applyCustomPeriod = (): void => {
    setIsAnalyticsLoading(true);
    setAnalyticsError("");
    setAnalyticsQuery({ period: "CUSTOM", startDate: analyticsStartDate, endDate: analyticsEndDate });
  };
  const startSession = (): void => { setMessage(""); setError(""); setIsSessionActive(true); };
  const openSessionDetails = (measurement: Measurement, trigger: HTMLTableRowElement): void => {
    detailTriggerRef.current = trigger;
    setSelectedSession(measurement);
  };
  const closeSessionDetails = useCallback((): void => {
    setSelectedSession(null);
    requestAnimationFrame(() => detailTriggerRef.current?.focus());
  }, []);
  const openComparison = (): void => {
    if (measurements.length < 2) return;
    const recent = measurements.slice().sort((left, right) => new Date(right.measurementDate).getTime() - new Date(left.measurementDate).getTime());
    setBaselineSessionId(recent[1].id);
    setComparisonSessionId(recent[0].id);
    setSessionComparison(null);
    setComparisonError("");
    setIsComparisonLoading(true);
    setIsComparisonOpen(true);
  };
  const changeBaselineSession = (sessionId: string): void => {
    if (sessionId === comparisonSessionId) return;
    setSessionComparison(null);
    setComparisonError("");
    setIsComparisonLoading(true);
    setBaselineSessionId(sessionId);
  };
  const changeComparisonSession = (sessionId: string): void => {
    if (sessionId === baselineSessionId) return;
    setSessionComparison(null);
    setComparisonError("");
    setIsComparisonLoading(true);
    setComparisonSessionId(sessionId);
  };
  const closeComparison = useCallback((): void => {
    setIsComparisonOpen(false);
    requestAnimationFrame(() => comparisonTriggerRef.current?.focus());
  }, []);

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
      await refreshMeasurements(); setWeightValue(""); setWeightRecordedAt(getLocalDateTimeValue()); setMessage("Weight saved. Same-day manual entries replace earlier entries.");
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
      <div className="page-brand-heading"><BrandLogo variant="symbol" className="page-brand-symbol" /><div><h1>{t("Body Measurements")}</h1><p>{t("Record weight and body measurements.")}</p></div></div>
      <div className="measurements-header-actions"><button type="button" className="secondary-button" onClick={() => navigate("/dashboard")}>{t("Back to Dashboard")}</button></div>
    </header>
    {error && !isSessionActive && <div className="measurement-banner measurement-banner-error" role="alert">{t(error)}</div>}
    {message && <div className="measurement-banner measurement-banner-success" role="status" aria-live="polite">{t(message)}</div>}

    <section className="measurement-quick-actions">
      <article className="dashboard-card daily-weight-card">
        <div className="measurement-section-heading"><div><h2>{t("Weight")}</h2></div></div>
        <div className="daily-weight-summary"><strong>{formatMeasurementValue(latestWeight?.weight, displayUnits.weight)}</strong><span>{latestWeight ? `${t("Last recorded")} ${new Date(latestWeight.recordedAt).toLocaleString(locale)}` : t("No weight recorded")}</span></div>
        <form className="daily-weight-form" onSubmit={handleWeightSubmit}>
          <label><span>{t("Weight")} <em>{displayUnits.weight}</em></span><input type="number" min="0" step={getMeasurementStep(displayUnits.weight)} value={weightValue} onChange={(event) => setWeightValue(event.target.value)} /></label>
          <label><span>{t("Observed at")}</span><input type="datetime-local" max={getLocalDateTimeValue()} value={weightRecordedAt} onChange={(event) => setWeightRecordedAt(event.target.value)} required /></label>
          <button type="submit" disabled={isSavingWeight}>{isSavingWeight ? t("Saving...") : t("Record weight")}</button>
        </form>
      </article>

      <article className="dashboard-card measurement-session-summary-card">
        <div className="measurement-section-heading"><div><h2>{t("Measurement session")}</h2></div></div>
        <div className="measurement-session-summary"><strong>{latestSession ? new Date(latestSession.measurementDate).toLocaleString(locale) : t("No session yet")}</strong></div>
        <button type="button" className="measurement-session-jump" onClick={startSession}>{t("Start measurement session")}</button>
      </article>
    </section>

    <section className="measurements-top-grid">
      <BodyTransformationInsights
        analytics={analytics}
        isLoading={isAnalyticsLoading}
        error={analyticsError}
        selectedPeriod={analyticsPeriod}
        customStartDate={analyticsStartDate}
        customEndDate={analyticsEndDate}
        onPeriodChange={changeAnalyticsPeriod}
        onCustomStartDateChange={setAnalyticsStartDate}
        onCustomEndDateChange={setAnalyticsEndDate}
        onApplyCustomPeriod={applyCustomPeriod}
      />
    </section>

    <section className="dashboard-card measurement-history-card">
      <div className="measurement-section-heading">
        <div><h2>{t("Body measurement sessions")}</h2></div>
        <div className="measurement-history-actions">
          <span className="measurement-record-count">{measurements.length} {t(measurements.length === 1 ? "session" : "sessions")}</span>
          <button
            ref={comparisonTriggerRef}
            type="button"
            className="secondary-button measurement-compare-button"
            onClick={openComparison}
            disabled={measurements.length < 2}
            title={measurements.length < 2 ? t("At least two sessions are required to compare.") : undefined}
          >{t("Compare sessions")}</button>
        </div>
      </div>
      {isLoading ? <p>{t("Loading measurements...")}</p>
        : measurements.length === 0 ? <div className="measurement-empty-state"><h3>{t("No sessions yet")}</h3><p>{t("Start a session to record body measurements.")}</p></div>
          : <MeasurementHistoryTable measurements={measurements} fallbackUnits={displayUnits} onSelect={openSessionDetails} />}
    </section>

    {selectedSession && <MeasurementSessionDetailModal
      measurement={selectedSession}
      fallbackUnits={displayUnits}
      onClose={closeSessionDetails}
    />}

    {isComparisonOpen && <MeasurementComparisonModal
      sessions={measurements}
      baselineSessionId={baselineSessionId}
      comparisonSessionId={comparisonSessionId}
      comparison={sessionComparison}
      isLoading={isComparisonLoading}
      error={comparisonError}
      onBaselineChange={changeBaselineSession}
      onComparisonChange={changeComparisonSession}
      onClose={closeComparison}
    />}

    <MeasurementSessionModal
      isOpen={isSessionActive}
      lengthUnit={displayUnits.length}
      onCancel={() => setIsSessionActive(false)}
      onSave={handleSessionSave}
    />
  </main>;
}
