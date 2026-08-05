import { useMemo, useState } from "react";
import type { HydrationEntry, HydrationUnit } from "../services/hydrationService";

const ARC_LENGTH = 75;
const ML_PER_OUNCE = 29.5735;
const ARC_CENTER_X = 180;
const ARC_CENTER_Y = 160;
const ARC_RADIUS = 116;
const ARC_LABEL_RADIUS = 143;
const ARC_LEVELS = [0, 25, 50, 75, 100] as const;

type ProgressMode = "daily" | "weekly";

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

function localDateKey(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function convertAmount(amount: number, from: HydrationUnit, to: HydrationUnit): number {
  if (from === to) return amount;
  return to === "ml" ? amount * ML_PER_OUNCE : amount / ML_PER_OUNCE;
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
  const [mode, setMode] = useState<ProgressMode>("daily");
  const rawGoalProgress = goal > 0 ? (dailyTotal / goal) * 100 : 0;
  const goalProgress = Math.min(rawGoalProgress, 100);
  const progressArc = (goalProgress / 100) * ARC_LENGTH;

  const weeklyDays = useMemo<WeeklyDay[]>(() => {
    const [year, month, day] = selectedDate.split("-").map(Number);
    const endDate = new Date(year, month - 1, day, 12, 0, 0, 0);
    const totals = new Map<string, number>();

    entries.forEach((entry) => {
      const key = localDateKey(new Date(entry.loggedAt));
      totals.set(
        key,
        (totals.get(key) ?? 0) + convertAmount(entry.amount, entry.unit, preferredUnit)
      );
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

  return (
    <div className="hydration-progress-visualization">
      <div className="hydration-progress-toggle" role="group" aria-label="Progress view">
        <button
          type="button"
          className={mode === "daily" ? "selected" : ""}
          aria-pressed={mode === "daily"}
          onClick={() => setMode("daily")}
        >
          Daily
        </button>
        <button
          type="button"
          className={mode === "weekly" ? "selected" : ""}
          aria-pressed={mode === "weekly"}
          onClick={() => setMode("weekly")}
        >
          7 Days
        </button>
      </div>

      {mode === "daily" ? (
        <div
          className="hydration-gauge"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(goalProgress)}
        >
          <svg viewBox="0 0 360 300" aria-hidden="true">
            <defs>
              <linearGradient id="hydrationArcGradient" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#a3e635" />
                <stop offset="38%" stopColor="#4ade80" />
                <stop offset="72%" stopColor="#16a34a" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
              <filter id="hydrationArcGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <circle
              className="hydration-gauge-track"
              cx={ARC_CENTER_X}
              cy={ARC_CENTER_Y}
              r={ARC_RADIUS}
              pathLength="100"
              transform={`rotate(135 ${ARC_CENTER_X} ${ARC_CENTER_Y})`}
            />
            <circle
              className="hydration-gauge-progress"
              cx={ARC_CENTER_X}
              cy={ARC_CENTER_Y}
              r={ARC_RADIUS}
              pathLength="100"
              transform={`rotate(135 ${ARC_CENTER_X} ${ARC_CENTER_Y})`}
              style={{ strokeDasharray: `${progressArc} ${100 - progressArc}` }}
            />
            {ARC_LEVELS.map((level) => {
              const vertex = getArcPoint(level, ARC_RADIUS);
              const label = getArcPoint(level, ARC_LABEL_RADIUS);
              return (
                <g key={level}>
                  <circle
                    className={level <= goalProgress ? "hydration-level hydration-level-active" : "hydration-level"}
                    cx={vertex.x}
                    cy={vertex.y}
                    r="5"
                  />
                  <text
                    className="hydration-arc-label"
                    x={label.x}
                    y={label.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {level}%
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="hydration-gauge-content">
            <strong>{formatAmount(dailyTotal, preferredUnit)}</strong>
            <span className="hydration-gauge-unit">{preferredUnit}</span>
            <p>Goal: {formatAmount(goal, preferredUnit)} {preferredUnit}</p>
            <b>{Math.round(rawGoalProgress)}%</b>
          </div>
        </div>
      ) : (
        <div className="hydration-weekly-chart" aria-label="Last 7 days hydration">
          <div className="hydration-weekly-plot">
            {goal > 0 && (
              <div
                className="hydration-weekly-goal-line"
                style={{ bottom: `${Math.min((goal / chartMaximum) * 100, 100)}%` }}
              >
                <span>Goal</span>
              </div>
            )}
            {weeklyDays.map((day) => {
              const height = day.total > 0 ? Math.max((day.total / chartMaximum) * 100, 3) : 0;
              const metGoal = goal > 0 && day.total >= goal;
              return (
                <div className="hydration-weekly-column" key={day.dateKey}>
                  <div className="hydration-weekly-value">
                    {formatAmount(day.total, preferredUnit)}
                  </div>
                  <div className="hydration-weekly-bar-track">
                    <div
                      className={metGoal ? "hydration-weekly-bar goal-met" : "hydration-weekly-bar"}
                      style={{ height: `${height}%` }}
                    />
                  </div>
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
