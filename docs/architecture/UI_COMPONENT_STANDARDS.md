# MyFitIdeas UI Component Standards

## Purpose

This document defines the shared interface patterns for MyFitIdeas. It complements `branding/brand-v1.0/WORKSPACE_DESIGN_SYSTEM.md` and the canonical workspace tokens in `branding/brand-v1.0/tokens/brand-tokens.json`.

The goal is to keep Personal and Administration workspaces visually distinct while using the same layout, accessibility, spacing, and interaction standards.

## Canonical implementation

Shared primitives are exported from:

```text
src/frontend/src/components/ui/index.ts
```

Workspace color variables are defined in:

```text
src/frontend/src/components/layout/WorkspaceTokens.css
```

New pages should use the shared primitives by default. Existing pages may migrate incrementally when they are otherwise being modified.

## Workspace selection

Use `workspace="personal"` for member health, fitness, progress, profile, and account experiences.

Use `workspace="administration"` for user management, RBAC, security operations, audit, translations, company settings, and system operations.

Do not introduce page-specific primary palettes. Add future workspace palettes to the canonical brand token file before using them in runtime CSS.

## Components

### AppPage

Use as the outer page container. It supplies the standard maximum width, responsive gutter, vertical spacing, workspace text color, and workspace variables.

```tsx
<AppPage workspace="personal">...</AppPage>
```

### PageHeader

Use once at the top of a page. The title and description must remain in a vertical stack. Put Back, Save, Create, or other page-level actions in `actions`.

```tsx
<PageHeader
  title={t("Measurements")}
  description={t("Record and review body measurements.")}
  actions={<button type="button">{t("Back to Dashboard")}</button>}
/>
```

The shared member or administration shell controls sticky and collapsed behavior. Do not create a second page logo inside the header.

### AppCard

Use for a neutral content container without a formal section heading.

### SectionCard

Use for a titled page section. Keep section-specific actions in the `actions` property rather than floating them elsewhere.

### MetricCard

Use for a single current metric such as weight, hydration, BMI, session count, or user count. The value is visually dominant; label and detail remain secondary.

### EmptyState

Use instead of plain text such as `No records found`. Provide a clear title, a concise explanation, and a useful primary action when one exists.

### StatusBadge

Use only for concise state information. Supported tones are `default`, `success`, `warning`, `danger`, and `info`. Do not use badges merely to say that a normal available feature is available.

### AppAlert

Use for page-level success, warning, information, and error feedback. Error alerts use `role="alert"`; other tones use `role="status"`.

### PageActionBar

Use for form submission or page-level actions at the bottom of a page. Primary action should appear last in left-to-right reading order.

## Buttons

Use the existing approved button classes and variants. Do not add one-off colors.

- Primary: workspace primary action
- Secondary: neutral navigation or low-risk action
- Danger: destructive or security-sensitive action
- Disabled future action: planned feature only

Buttons must have visible keyboard focus, usable accessible names, and a minimum practical touch target.

## Layout and spacing

- Standard content width: 1200 px maximum
- Page horizontal gutter: 1rem minimum
- Header radius: 16 px
- Standard card radius: 14 px
- Page section gap: 1.5rem
- Card padding: 1.25rem
- Mobile breakpoint: 700 px unless the component requires a narrower content-specific breakpoint

Avoid new arbitrary spacing values when an existing pattern is suitable.

## Responsive behavior

At mobile widths:

- Header title and description remain stacked.
- Header and section actions move below copy.
- Action groups may expand to full width.
- Multi-column card grids collapse to one column.
- Tables must scroll horizontally or transform into accessible cards.

Do not hide required information solely to make a layout fit.

## Loading and empty states

Use structured skeletons for long-loading card or table content when practical. Short operations may use concise progress text or disabled-button feedback.

Empty states should explain why the area is empty and what the user can do next.

## Accessibility

All components and pages must support:

- Keyboard navigation
- Visible focus indication
- Logical heading order
- Programmatic labels for form controls
- Sufficient color contrast
- Reduced-motion preferences
- Screen-reader status or alert announcements where appropriate

Color may reinforce state but must not be the only signal.

## Localization

All user-facing English source text must be registered in the appropriate translation catalog. Member features use member catalogs; administration and workspace shell text use administration catalogs.

Do not bypass the localization guard for normal user-facing text.

## Migration policy

Do not rewrite stable pages solely to use a new primitive immediately before a release. Migrate a page when:

1. It is receiving feature work.
2. Its layout has a known inconsistency.
3. The migration removes duplicated logic or styling.
4. The page can be fully regression tested.

New Phase 7 and later pages should begin with the shared primitives.

## Change control

Changes to workspace colors, shared radii, content width, or primary component behavior must update:

1. `branding/brand-v1.0/tokens/brand-tokens.json`
2. `branding/brand-v1.0/WORKSPACE_DESIGN_SYSTEM.md`
3. Runtime workspace tokens or shared primitives
4. This document when component usage changes
