import { useEffect, useState, type ReactNode } from "react";
import Button from "../ui/Button";
import "./AdminComponents.css";

export type AdminBadgeTone = "neutral" | "info" | "success" | "warning" | "danger" | "protected";

interface AdminPageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  backLabel: string;
  onBack: () => void;
  actions?: ReactNode;
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  backLabel,
  onBack,
  actions,
}: AdminPageHeaderProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const update = () => setCollapsed(window.scrollY > 72);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header className={`admin-header admin-ds-header${collapsed ? " collapsed" : ""}`}>
      <div className="admin-ds-header-copy">
        <p className="admin-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="admin-ds-header-description">{description}</p>
      </div>
      <div className="admin-ds-header-actions">
        {actions}
        <Button variant="outline" onClick={onBack}>{backLabel}</Button>
      </div>
    </header>
  );
}

interface AdminBadgeProps {
  children: ReactNode;
  tone?: AdminBadgeTone;
  dot?: boolean;
}

export function AdminBadge({ children, tone = "neutral", dot = false }: AdminBadgeProps) {
  return <span className={`admin-ds-badge ${tone}${dot ? " with-dot" : ""}`}>{children}</span>;
}

interface AdminLoadingStateProps {
  label: string;
  compact?: boolean;
}

export function AdminLoadingState({ label, compact = false }: AdminLoadingStateProps) {
  return (
    <div className={`admin-ds-loading${compact ? " compact" : ""}`} role="status" aria-live="polite">
      <span className="admin-ds-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

interface AdminModuleCardProps {
  title: string;
  description: string;
  action: string;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}

export function AdminModuleCard({
  title,
  description,
  action,
  onClick,
  disabled = false,
  ariaLabel,
}: AdminModuleCardProps) {
  const content = (
    <>
      <span className="admin-module-title">{title}</span>
      <span className="admin-module-description">{description}</span>
      <span className={`admin-module-action${disabled ? " future-module-note" : ""}`}>{action}</span>
    </>
  );

  if (disabled) {
    return <article className="admin-module-card admin-module-tile planned-module" aria-disabled="true">{content}</article>;
  }

  return (
    <button
      type="button"
      className="admin-module-card admin-module-tile active-module"
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {content}
    </button>
  );
}
