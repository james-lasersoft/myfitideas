import type { FormEvent } from "react";
import { useLocale } from "../../i18n/LocaleContext";
import type {
  AnalyticsPeriod,
  BodyTransformationAnalytics,
  BodyTransformationTrend,
  ConsistencySummary,
} from "../../services/bodyTransformationService";

const coreLabels = { neck: "Neck", chest: "Chest", waist: "Waist", hips: "Hips" } as const;
const pairLabels = { upperArms: "Upper arms", thighs: "Thighs", calves: "Calves" } as const;
const calculatedLabels = {
  bmi: "BMI",
  bodyFat: "Body fat",
  waistToHeightRatio: "Waist-to-height",
  fatMass: "Fat mass",
  leanMass: "Lean mass",
} as const;
const directionLabels = {
  INCREASING: "Increasing",
  DECREASING: "Decreasing",
  STABLE: "Stable",
  INSUFFICIENT_DATA: "Direction unavailable",
} as const;
const reliabilityLabels = {
  UNAVAILABLE: "No observations",
  CURRENT_ONLY: "Current value only",
  BASIC_CHANGE: "Basic change",
  TREND_ELIGIBLE: "Trend eligible",
} as const;

interface Props {
  analytics: BodyTransformationAnalytics | null;
  isLoading: boolean;
  error: string;
  selectedPeriod: AnalyticsPeriod;
  customStartDate: string;
  customEndDate: string;
  onPeriodChange: (period: AnalyticsPeriod) => void;
  onCustomStartDateChange: (value: string) => void;
  onCustomEndDateChange: (value: string) => void;
  onApplyCustomPeriod: () => void;
}

function formatNumber(value: number, locale: string, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits, minimumFractionDigits: 0 }).format(value);
}
function formatValue(trend: BodyTransformationTrend, locale: string, t: (text: string) => string): string {
  if (trend.endValue === null) return "\u2014";
  const digits = trend.unitCode === "ratio" ? 3 : 2;
  const value = formatNumber(trend.endValue, locale, digits);
  if (trend.unitCode === "percent") return `${value}%`;
  if (trend.unitCode === "ratio") return value;
  if (trend.unitCode === "kg_per_m2") return `${value} ${t("kg/m²")}`;
  return `${value} ${trend.unitCode}`;
}
function formatChange(trend: BodyTransformationTrend, locale: string, t: (text: string) => string): string {
  if (trend.absoluteChange === null) return "\u2014";
  const sign = trend.absoluteChange > 0 ? "+" : "";
  const digits = trend.unitCode === "ratio" ? 3 : 2;
  const unit = trend.unitCode === "percent"
    ? "%"
    : trend.unitCode === "ratio"
      ? ""
      : trend.unitCode === "kg_per_m2"
        ? ` ${t("kg/m²")}`
        : ` ${trend.unitCode}`;
  const absolute = `${sign}${formatNumber(trend.absoluteChange, locale, digits)}${unit}`;
  if (trend.percentageChange === null) return absolute;
  const percentageSign = trend.percentageChange > 0 ? "+" : "";
  return `${absolute} (${percentageSign}${formatNumber(trend.percentageChange, locale, 2)}%)`;
}

function TrendText({ trend, kind }: { trend: BodyTransformationTrend; kind: "value" | "change" | "direction" | "reliability" }) {
  const { locale, t } = useLocale();
  if (kind === "value") return <>{formatValue(trend, locale, t)}</>;
  if (kind === "change") return <>{formatChange(trend, locale, t)}</>;
  if (kind === "direction") return <>{t(directionLabels[trend.direction])}</>;
  return <>{t(reliabilityLabels[trend.reliability])} · {trend.observationCount} {t(trend.observationCount === 1 ? "observation" : "observations")}</>;
}
function PairText({ left, right, kind }: {
  left: BodyTransformationTrend;
  right: BodyTransformationTrend;
  kind: "value" | "change" | "direction" | "reliability";
}) {
  const { t } = useLocale();
  return <span className="measurement-analytics-pair">
    <span><b>{t("Left")}:</b> <TrendText trend={left} kind={kind} /></span>
    <span><b>{t("Right")}:</b> <TrendText trend={right} kind={kind} /></span>
  </span>;
}
function ConsistencyItem({ label, summary }: { label: string; summary: ConsistencySummary }) {
  const { locale, t } = useLocale();
  return <div className="measurement-analytics-consistency-item">
    <dt>{t(label)}</dt>
    <dd>
      {summary.coveragePercentage === null
        ? t("No recording consistency data")
        : <>{formatNumber(summary.coveragePercentage, locale, 2)}% · {summary.coveredIntervalCount} {t("of")} {summary.totalIntervalCount} {t(summary.intervalUnit === "DAY" ? "days" : "weeks")}</>}
    </dd>
  </div>;
}

export default function BodyTransformationInsights(props: Props) {
  const { locale, t } = useLocale();
  const submitCustom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    props.onApplyCustomPeriod();
  };
  return <article className="dashboard-card measurement-insights-card">
    <div className="measurement-section-heading">
      <div><span className="measurement-eyebrow">{t("Progress overview")}</span><h2>{t("Body transformation intelligence")}</h2></div>
      <label className="measurement-analytics-period">
        <span>{t("Insight period")}</span>
        <select value={props.selectedPeriod} onChange={(event) => props.onPeriodChange(event.target.value as AnalyticsPeriod)}>
          <option value="LAST_7_DAYS">{t("Last 7 days")}</option>
          <option value="LAST_30_DAYS">{t("Last 30 days")}</option>
          <option value="LAST_90_DAYS">{t("Last 90 days")}</option>
          <option value="ALL_HISTORY">{t("All history")}</option>
          <option value="CUSTOM">{t("Custom range")}</option>
        </select>
      </label>
    </div>

    {props.selectedPeriod === "CUSTOM" && <form className="measurement-analytics-custom-period" onSubmit={submitCustom}>
      <label><span>{t("Start date")}</span><input type="date" value={props.customStartDate} onChange={(event) => props.onCustomStartDateChange(event.target.value)} required /></label>
      <label><span>{t("End date")}</span><input type="date" value={props.customEndDate} onChange={(event) => props.onCustomEndDateChange(event.target.value)} required /></label>
      <button type="submit" className="secondary-button">{t("Apply range")}</button>
    </form>}

    {props.isLoading ? <p role="status">{t("Loading body transformation insights...")}</p>
      : props.error ? <p className="measurement-banner measurement-banner-error" role="alert">{t(props.error)}</p>
        : props.analytics && !props.analytics.dataSufficiency.hasAnyData
          ? <div className="measurement-empty-state"><h3>{t("No body transformation data in this period")}</h3><p>{t("Record weight or body measurements to build factual trends.")}</p></div>
          : props.analytics && <>
            <p id="measurement-analytics-summary" className="measurement-analytics-summary">
              <span>{t("Selected period")}: {props.analytics.period.startDate ? new Date(props.analytics.period.startDate).toLocaleDateString(locale) : t("Beginning of history")} - {new Date(props.analytics.period.endDate).toLocaleDateString(locale)}</span>
              <span>{props.analytics.dataSufficiency.bodyWeightObservationCount} {t(props.analytics.dataSufficiency.bodyWeightObservationCount === 1 ? "weight observation" : "weight observations")}
              {" · "}
              {props.analytics.dataSufficiency.measurementSessionCount} {t(props.analytics.dataSufficiency.measurementSessionCount === 1 ? "measurement session" : "measurement sessions")}</span>
            </p>
            <p id="measurement-analytics-reliability" className="measurement-analytics-help">{t("Reliability reflects only the number of available observations.")}</p>
            <div className="measurement-table-wrap">
              <table className="measurement-table measurement-analytics-table" aria-describedby="measurement-analytics-summary measurement-analytics-reliability">
                <caption>{t("Backend-calculated body transformation changes for the selected period.")}</caption>
                <thead><tr><th scope="col">{t("Metric")}</th><th scope="col">{t("Current value")}</th><th scope="col">{t("Change")}</th><th scope="col">{t("Direction")}</th><th scope="col">{t("Data reliability")}</th></tr></thead>
                <tbody>
                  <tr><th scope="row">{t("Weight")}</th><td><TrendText trend={props.analytics.weight} kind="value" /></td><td><TrendText trend={props.analytics.weight} kind="change" /></td><td><TrendText trend={props.analytics.weight} kind="direction" /></td><td><TrendText trend={props.analytics.weight} kind="reliability" /></td></tr>
                  {props.analytics.coreMeasurements.map(({ field, trend }) => <tr key={field}><th scope="row">{t(coreLabels[field])}</th><td><TrendText trend={trend} kind="value" /></td><td><TrendText trend={trend} kind="change" /></td><td><TrendText trend={trend} kind="direction" /></td><td><TrendText trend={trend} kind="reliability" /></td></tr>)}
                  {props.analytics.pairedMeasurements.map(({ field, left, right }) => <tr key={field}><th scope="row">{t(pairLabels[field])}</th><td><PairText left={left} right={right} kind="value" /></td><td><PairText left={left} right={right} kind="change" /></td><td><PairText left={left} right={right} kind="direction" /></td><td><PairText left={left} right={right} kind="reliability" /></td></tr>)}
                  {props.analytics.calculatedMetrics.map(({ field, trend }) => <tr key={field}><th scope="row">{t(calculatedLabels[field])}</th><td><TrendText trend={trend} kind="value" /></td><td><TrendText trend={trend} kind="change" /></td><td><TrendText trend={trend} kind="direction" /></td><td><TrendText trend={trend} kind="reliability" /></td></tr>)}
                </tbody>
              </table>
            </div>
            <section className="measurement-analytics-consistency" aria-labelledby="measurement-consistency-heading">
              <h3 id="measurement-consistency-heading">{t("Recording consistency")}</h3>
              <p>{t("Coverage reports recorded intervals only and does not judge progress.")}</p>
              <dl>
                <ConsistencyItem label="Weight recording days" summary={props.analytics.consistency.bodyWeight} />
                <ConsistencyItem label="Measurement-session weeks" summary={props.analytics.consistency.measurementSessions} />
              </dl>
            </section>
          </>}
  </article>;
}
