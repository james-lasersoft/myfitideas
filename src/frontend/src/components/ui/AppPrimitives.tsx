import type { HTMLAttributes, ReactNode } from "react";
import "./AppPrimitives.css";

type Workspace = "personal" | "administration";
type Tone = "default" | "success" | "warning" | "danger" | "info";

function classes(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function AppPage({
  children,
  workspace = "personal",
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { workspace?: Workspace }) {
  return (
    <main className={classes("app-page", `app-page-${workspace}`, className)} {...props}>
      {children}
    </main>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={classes("app-page-header", className)}>
      <div className="app-page-header-copy">
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="app-page-header-actions">{actions}</div> : null}
    </header>
  );
}

export function AppCard({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <section className={classes("app-card", className)} {...props}>
      {children}
    </section>
  );
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={classes("app-section-card", className)}>
      {(title || description || actions) ? (
        <div className="app-section-card-header">
          <div>
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? <div className="app-section-card-actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className="app-section-card-body">{children}</div>
    </section>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  className?: string;
}) {
  return (
    <article className={classes("app-metric-card", className)}>
      <span className="app-metric-card-label">{label}</span>
      <strong className="app-metric-card-value">{value}</strong>
      {detail ? <span className="app-metric-card-detail">{detail}</span> : null}
    </article>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={classes("app-empty-state", className)}>
      {icon ? <div className="app-empty-state-icon" aria-hidden="true">{icon}</div> : null}
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {action ? <div className="app-empty-state-action">{action}</div> : null}
    </div>
  );
}

export function StatusBadge({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return <span className={classes("app-status-badge", `app-status-${tone}`, className)}>{children}</span>;
}

export function AppAlert({
  children,
  tone = "info",
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: Exclude<Tone, "default"> }) {
  return (
    <div className={classes("app-alert", `app-alert-${tone}`, className)} role={tone === "danger" ? "alert" : "status"} {...props}>
      {children}
    </div>
  );
}

export function PageActionBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={classes("app-page-action-bar", className)}>{children}</div>;
}
