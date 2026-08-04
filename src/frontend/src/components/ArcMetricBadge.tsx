import { useEffect, useId, useState, type CSSProperties, type ReactNode } from "react";
import "./ArcMetricBadge.css";

interface ArcMetricBadgeProps {
  title: string;
  icon: ReactNode;
  value: string;
  detail?: string;
  status?: string;
  progress?: number | null;
  accent: string;
  children?: ReactNode;
}

const ARC_LENGTH = 251.2;

export default function ArcMetricBadge({
  title,
  icon,
  value,
  detail,
  status,
  progress,
  accent,
  children,
}: ArcMetricBadgeProps) {
  const titleId = useId();
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const normalizedProgress = Math.max(0, Math.min(progress ?? 0, 100));

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setAnimatedProgress(normalizedProgress);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [normalizedProgress]);

  const dashOffset = ARC_LENGTH - (ARC_LENGTH * animatedProgress) / 100;

  return (
    <article
      className="arc-metric-badge"
      style={{ "--arc-accent": accent } as CSSProperties}
      aria-labelledby={titleId}
    >
      <div className="arc-metric-visual">
        <svg className="arc-metric-svg" viewBox="0 0 120 120" aria-hidden="true">
          <circle className="arc-metric-track" cx="60" cy="60" r="40" pathLength="100" />
          <circle
            className="arc-metric-progress"
            cx="60"
            cy="60"
            r="40"
            pathLength="100"
            style={{ strokeDashoffset: dashOffset }}
          />
        </svg>
        <div className="arc-metric-center">
          <span className="arc-metric-icon">{icon}</span>
          <strong className="arc-metric-value">{value}</strong>
        </div>
      </div>

      <div className="arc-metric-copy">
        <h2 id={titleId}>{title}</h2>
        {detail && <p className="arc-metric-detail">{detail}</p>}
        {status && <p className="arc-metric-status">{status}</p>}
      </div>

      {children && <div className="arc-metric-actions">{children}</div>}
    </article>
  );
}
