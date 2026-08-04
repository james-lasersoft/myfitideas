import type { CSSProperties, ReactNode } from "react";
import "./ArcMetricBadge.css";

interface ArcMetricBadgeProps {
  title: string;
  value: string;
  detail: string;
  icon: ReactNode;
  progress?: number | null;
  accent: string;
  status?: string;
  onClick?: () => void;
  ariaLabel?: string;
}

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC_FRACTION = 0.75;
const ARC_LENGTH = CIRCUMFERENCE * ARC_FRACTION;

function clampProgress(progress: number | null | undefined): number {
  if (progress == null || Number.isNaN(progress)) return 0;
  return Math.min(100, Math.max(0, progress));
}

export default function ArcMetricBadge({
  title,
  value,
  detail,
  icon,
  progress,
  accent,
  status,
  onClick,
  ariaLabel,
}: ArcMetricBadgeProps) {
  const normalizedProgress = clampProgress(progress);
  const progressLength = ARC_LENGTH * (normalizedProgress / 100);
  const style = { "--metric-accent": accent } as CSSProperties;
  const content = (
    <>
      <div className="arc-metric-visual" aria-hidden="true">
        <svg className="arc-metric-svg" viewBox="0 0 132 132">
          <circle
            className="arc-metric-track"
            cx="66"
            cy="66"
            r={RADIUS}
            pathLength={CIRCUMFERENCE}
            strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE}`}
          />
          <circle
            className="arc-metric-progress"
            cx="66"
            cy="66"
            r={RADIUS}
            pathLength={CIRCUMFERENCE}
            strokeDasharray={`${progressLength} ${CIRCUMFERENCE}`}
          />
        </svg>
        <div className="arc-metric-center">
          <span className="arc-metric-icon">{icon}</span>
          <strong className="arc-metric-value">{value}</strong>
        </div>
      </div>

      <div className="arc-metric-copy">
        <h2>{title}</h2>
        <p>{detail}</p>
        {status && <span className="arc-metric-status">{status}</span>}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className="arc-metric-card arc-metric-card-button"
        style={style}
        onClick={onClick}
        aria-label={ariaLabel ?? `${title}: ${value}. ${detail}`}
      >
        {content}
      </button>
    );
  }

  return (
    <article
      className="arc-metric-card"
      style={style}
      aria-label={ariaLabel ?? `${title}: ${value}. ${detail}`}
    >
      {content}
    </article>
  );
}
