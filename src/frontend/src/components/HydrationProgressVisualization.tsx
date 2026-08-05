import { useMemo, useState, type PointerEvent } from "react";
import { useLocale } from "../i18n/LocaleContext";
import type { HydrationEntry, HydrationUnit } from "../services/hydrationService";

const ARC_LENGTH = 75;
const ML_PER_OUNCE = 29.5735;
const ARC_CENTER_X = 180;
const ARC_CENTER_Y = 160;
const ARC_RADIUS = 116;
const ARC_LABEL_RADIUS = 143;
const ARC_LEVELS = [0, 25, 50, 75, 100] as const;

type ProgressMode = "daily" | "weekly";
type TooltipKind = "remaining" | "consumed" | "effective" | null;

interface HydrationProgressVisualizationProps {
  entries: HydrationEntry[];
  goal: number;
  preferredUnit: HydrationUnit;
  selectedDate: string;
  dailyTotal: number;
}

interface WeeklyDay {
  dateKey: string;
  dayLabel: string;
  dateLabel: string;
  total: number;
}

interface TooltipState {
  kind: TooltipKind;
  x: number;
  y: number;
}

function localDateKey(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function convertAmount(amount: number, from: HydrationUnit, to: HydrationUnit): number {
  if (from === to) return amount;
  return to === "ml" ? amount * ML_PER_OUNCE : amount / ML_PER_OUNCE;
}

function fromMilliliters(amountMl: number, unit: HydrationUnit): number {
  return unit === "ml" ? amountMl : amountMl / ML_PER_OUNCE;
}

function formatAmount(value: number, unit: HydrationUnit): string {
  return unit === "ml" ? value.toFixed(0) : value.toFixed(1);
}

function getArcPoint(level: number, radius: number): { x: number; y: number } {
  const angle = (135 + (270 * level) / 100) * (Math.PI / 180);
  return {
    x: ARC_CENTER_X + radius * Math.cos(angle),
    y: ARC_CENTER_Y + radius * Math.sin(angle),
  };
}

export default function HydrationProgressVisualization({
  entries,
  goal,
  preferredUnit,
  selectedDate,
  dailyTotal,
}: HydrationProgressVisualizationProps) {
  const { t } = useLocale();
  const [mode, setMode] = useState<ProgressMode>("daily");
  const [tooltip, setTooltip] = useState<TooltipState>({ kind: null, x: 180, y: 42 });

  const selectedEntries = useMemo(
    () => entries.filter((entry) => localDateKey(new Date(entry.loggedAt)) === selectedDate),
    [entries, selectedDate]
  );

  const effectiveTotal = useMemo(
    () => selectedEntries.reduce(
      (total, entry) => total + fromMilliliters(entry.effectiveAmountMl ?? entry.amountMl, preferredUnit),
      0
    ),
    [preferredUnit, selectedEntries]
  );

  const consumedGoalProgress = goal > 0 ? (dailyTotal / goal) * 100 : 0;
  const effectiveGoalProgress = goal > 0 ? (effectiveTotal / goal) * 100 : 0;
  const cappedConsumedProgress = Math.min(consumedGoalProgress, 100);
  const cappedEffectiveProgress = Math.min(effectiveGoalProgress, 100);
  const consumedArc = (cappedConsumedProgress / 100) * ARC_LENGTH;
  const effectiveArc = (cappedEffectiveProgress / 100) * ARC_LENGTH;
  const remaining = Math.max(goal - effectiveTotal, 0);

  const weeklyDays = useMemo<WeeklyDay[]>(() => {
    const [year, month, day] = selectedDate.split("-").map(Number);
    const endDate = new Date(year, month - 1, day, 12, 0, 0, 0);
    const totals = new Map<string, number>();

    entries.forEach((entry) => {
      const key = localDateKey(new Date(entry.loggedAt));
      totals.set(key, (totals.get(key) ?? 0) + convertAmount(entry.amount, entry.unit, preferredUnit));
    });

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(endDate);
      date.setDate(endDate.getDate() - (6 - index));
      const dateKey = localDateKey(date);
      return {
        dateKey,
        dayLabel: new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date),
        dateLabel: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date),
        total: totals.get(dateKey) ?? 0,
      };
    });
  }, [entries, preferredUnit, selectedDate]);

  const chartMaximum = Math.max(goal, ...weeklyDays.map((day) => day.total), 1);

  const showPointerTooltip = (kind: Exclude<TooltipKind, null>, event: PointerEvent<SVGCircleElement>) => {
    const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!bounds) return;
    setTooltip({
      kind,
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  };

  const hideTooltip = () => setTooltip((current) => ({ ...current, kind: null }));

  const tooltipTitle = tooltip.kind === "effective"
    ? t("Effective hydration")
    : tooltip.kind === "consumed"
      ? t("Beverages consumed")
      : t("Remaining to goal");
  const tooltipValue = tooltip.kind === "effective"
    ? effectiveTotal
    : tooltip.kind === "consumed"
      ? dailyTotal
      : remaining;

  return (
    <div className="hydration-progress-visualization">
      <div className="hydration-progress-toggle" role="group" aria-label={t("Progress view")}>
        <button type="button" className={mode === "daily" ? "selected" : ""} aria-pressed={mode === "daily"} onClick={() => setMode("daily")}>
          {t("Daily")}
        </button>
        <button type="button" className={mode === "weekly" ? "selected" : ""} aria-pressed={mode === "weekly"} onClick={() => setMode("weekly")}>
          {t("7 Days")}
        </button>
      </div>

      {mode === "daily" ? (
        <div
          className="hydration-gauge"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(cappedEffectiveProgress)}
          aria-valuetext={`${formatAmount(effectiveTotal, preferredUnit)} ${preferredUnit} ${t("effective")}`}
          onPointerLeave={hideTooltip}
        >
          <svg viewBox="0 0 360 300" aria-hidden="false">
            <circle
              className="hydration-gauge-track"
              cx={ARC_CENTER_X}
              cy={ARC_CENTER_Y}
              r={ARC_RADIUS}
              pathLength="100"
              transform={`rotate(135 ${ARC_CENTER_X} ${ARC_CENTER_Y})`}
              tabIndex={0}
              role="img"
              aria-label={`${t("Remaining to goal")}: ${formatAmount(remaining, preferredUnit)} ${preferredUnit}`}
              onPointerEnter={(event) => showPointerTooltip("remaining", event)}
              onPointerMove={(event) => showPointerTooltip("remaining", event)}
              onPointerDown={(event) => showPointerTooltip("remaining", event)}
              onFocus={() => setTooltip({ kind: "remaining", x: 180, y: 45 })}
              onBlur={hideTooltip}
            />
            <circle
              className="hydration-gauge-consumed"
              cx={ARC_CENTER_X}
              cy={ARC_CENTER_Y}
              r={ARC_RADIUS}
              pathLength="100"
              transform={`rotate(135 ${ARC_CENTER_X} ${ARC_CENTER_Y})`}
              style={{ strokeDasharray: `${consumedArc} ${100 - consumedArc}` }}
              tabIndex={0}
              role="img"
              aria-label={`${t("Beverages consumed")}: ${formatAmount(dailyTotal, preferredUnit)} ${preferredUnit}`}
              onPointerEnter={(event) => showPointerTooltip("consumed", event)}
              onPointerMove={(event) => showPointerTooltip("consumed", event)}
              onPointerDown={(event) => showPointerTooltip("consumed", event)}
              onFocus={() => setTooltip({ kind: "consumed", x: 180, y: 45 })}
              onBlur={hideTooltip}
            />
            <circle
              className="hydration-gauge-effective"
              cx={ARC_CENTER_X}
              cy={ARC_CENTER_Y}
              r={ARC_RADIUS}
              pathLength="100"
              transform={`rotate(135 ${ARC_CENTER_X} ${ARC_CENTER_Y})`}
              style={{ strokeDasharray: `${effectiveArc} ${100 - effectiveArc}` }}
              tabIndex={0}
              role="img"
              aria-label={`${t("Effective hydration")}: ${formatAmount(effectiveTotal, preferredUnit)} ${preferredUnit}`}
              onPointerEnter={(event) => showPointerTooltip("effective", event)}
              onPointerMove={(event) => showPointerTooltip("effective", event)}
              onPointerDown={(event) => showPointerTooltip("effective", event)}
              onFocus={() => setTooltip({ kind: "effective", x: 180, y: 45 })}
              onBlur={hideTooltip}
            />
            {ARC_LEVELS.map((level) => {
              const vertex = getArcPoint(level, ARC_RADIUS);
              const label = getArcPoint(level, ARC_LABEL_RADIUS);
              return (
                <g key={level}>
                  <circle className={level <= cappedEffectiveProgress ? "hydration-level hydration-level-active" : "hydration-level"} cx={vertex.x} cy={vertex.y} r="5" />
                  <text className="hydration-arc-label" x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle">{level}%</text>
                </g>
              );
            })}
          </svg>

          {tooltip.kind && (
            <div className="hydration-arc-tooltip" role="status" style={{ left: tooltip.x, top: tooltip.y }}>
              <strong>{tooltipTitle}</strong>
              <span>{formatAmount(tooltipValue, preferredUnit)} {preferredUnit}</span>
              {tooltip.kind === "effective" && <small>{Math.round(effectiveGoalProgress)}% {t("of goal")}</small>}
              {tooltip.kind === "consumed" && <small>{formatAmount(effectiveTotal, preferredUnit)} {preferredUnit} {t("effective")}</small>}
            </div>
          )}

          <div className="hydration-gauge-content">
            <strong>{formatAmount(effectiveTotal, preferredUnit)}</strong>
            <span className="hydration-gauge-unit">{preferredUnit}</span>
            <p>{t("Goal:")} {formatAmount(goal, preferredUnit)} {preferredUnit}</p>
          </div>
        </div>
      ) : (
        <div className="hydration-weekly-chart" aria-label={t("Last 7 days hydration")}>
          <div className="hydration-weekly-plot">
            {goal > 0 && <div className="hydration-weekly-goal-line" style={{ bottom: `${Math.min((goal / chartMaximum) * 100, 100)}%` }}><span>{t("Goal")}</span></div>}
            {weeklyDays.map((day) => {
              const height = day.total > 0 ? Math.max((day.total / chartMaximum) * 100, 3) : 0;
              const metGoal = goal > 0 && day.total >= goal;
              return (
                <div className="hydration-weekly-column" key={day.dateKey}>
                  <div className="hydration-weekly-value">{formatAmount(day.total, preferredUnit)}</div>
                  <div className="hydration-weekly-bar-track"><div className={metGoal ? "hydration-weekly-bar goal-met" : "hydration-weekly-bar"} style={{ height: `${height}%` }} /></div>
                  <strong>{day.dayLabel}</strong>
                  <span>{day.dateLabel}</span>
                </div>
              );
            })}
          </div>
          <p className="hydration-weekly-unit">{preferredUnit}</p>
        </div>
      )}
    </div>
  );
}
