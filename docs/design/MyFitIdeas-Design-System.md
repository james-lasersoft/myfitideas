# MyFitIdeas Design System

**Status:** Phase 6.5 foundation  
**Last updated:** August 4, 2026

## Purpose

The MyFitIdeas Design System (MDS) defines the shared visual, interaction, accessibility, and responsive rules used across the product. It supports two related but intentionally distinct experiences:

1. **Member Experience** for health, fitness, motivation, progress, and coaching.
2. **Administration Experience** for business operations, security, governance, support, and configuration.

The two experiences should remain recognizably part of the same product while making context immediately clear.

## Experience Principles

### Member Experience

- Friendly, encouraging, and progress-oriented.
- Blue and green brand colors.
- Rounded surfaces and visually expressive progress components.
- Charts, metric cards, goals, achievements, and motivational language.

### Administration Experience

- Professional, calm, operational, and information-dense.
- Navy, slate, steel gray, and white surfaces.
- Color used primarily to communicate state, risk, or action priority.
- Consistent tables, forms, filters, confirmation dialogs, badges, and audit feedback.

## Administration Color Tokens

| Token | Light value | Purpose |
|---|---:|---|
| `admin-navy-950` | `#142033` | Highest-emphasis enterprise surface or text |
| `admin-navy-900` | `#1B2D4C` | Primary enterprise identity |
| `admin-navy-800` | `#294366` | Strong actions and headings |
| `admin-blue-600` | `#355B94` | Interactive accent |
| `admin-blue-500` | `#4772AD` | Hover and supporting accent |
| `admin-slate-700` | `#46566A` | Secondary text |
| `admin-slate-500` | `#708096` | Muted text |
| `admin-slate-200` | `#D9E0E8` | Borders |
| `admin-slate-100` | `#EDF1F5` | Muted surfaces |
| `admin-slate-50` | `#F5F7FA` | Page background |

Semantic states remain shared across the product:

- Success: green
- Information: blue
- Warning: amber
- Error or destructive action: red
- Disabled or future functionality: neutral gray

Color must never be the only means of communicating state.

## Typography Hierarchy

- Page title: primary page purpose.
- Section title: major functional grouping.
- Card title: concise object or module name.
- Statistic: high-emphasis numeric value.
- Body: standard explanatory content.
- Caption: metadata and supporting details.
- Badge: short state or classification label.
- Button: action-oriented text using sentence case.

## Core Components

Phase 6.5 will standardize these reusable administration components:

- `AdminPageHeader`
- `AdminCard`
- `AdminStatisticCard`
- `AdminBadge`
- `AdminToolbar`
- `AdminTable`
- `AdminDialog`
- `AdminToast`
- `AdminEmptyState`
- `AdminLoadingState`

New administration pages should use shared components instead of creating page-specific visual patterns.

## Cards and Modules

- Available modules display a title, description, and plain-text action.
- Development labels such as **Available** and **Planned** are not part of the finished interface.
- Navigation arrows are omitted unless they communicate a unique interaction.
- Future modules remain visible only when useful for product orientation. They use a muted surface and the note **Coming in a future phase**.
- Disabled modules must not appear interactive.

## Tables

Administration tables should share:

- Search and filter placement.
- Sortable headers where meaningful.
- Pagination for potentially large datasets.
- Stable loading states that do not flash on every keystroke.
- Status badges and consistent row actions.
- Responsive overflow behavior.
- Clear empty and error states.

## Forms

All forms should provide:

- Visible labels.
- Required-field indicators when applicable.
- Disabled and read-only distinction.
- Field-level validation.
- Loading or saving state.
- Actionable error messages.
- Success feedback through the shared notification pattern.

## Dialogs and Destructive Actions

- Do not use browser confirmation dialogs.
- Destructive actions require a dedicated confirmation dialog or panel.
- The target object name must be visible.
- The interface must remain open when the server rejects the action.
- Backend error details should be translated into actionable user feedback.
- Destructive actions use the danger visual hierarchy.

## Badges

The badge system supports states and classifications such as:

- Active
- Pending
- Suspended
- Protected
- System
- Premium
- Coach
- Translator
- Support
- Healthy
- Offline

Badge text must remain readable at 200% zoom and in dark mode.

## Icons

A single icon family will be selected for the product. Each concept receives one consistent icon assignment across navigation, cards, tables, and dialogs. Initial concepts include:

- Users
- Roles
- Permissions
- Security
- Translations
- Audit
- Settings
- Billing
- Analytics
- Nutrition
- Measurements
- Hydration

Icons support labels and do not replace essential text.

## Accessibility

- Target WCAG 2.2 AA contrast.
- Preserve visible keyboard focus.
- All actions must be keyboard accessible.
- Dialogs require appropriate labeling and focus management.
- Loading and result messages use suitable live-region behavior.
- Status cannot depend on color alone.
- Touch targets should generally be at least 44 by 44 CSS pixels.

## Dark Mode

- Dark mode uses dedicated semantic tokens rather than inverted light colors.
- Surfaces must retain clear elevation and border separation.
- Muted text must remain readable.
- Success, warning, and error states must maintain equivalent meaning and contrast.

## Responsive Rules

- Administration content should remain usable at narrow desktop and tablet widths.
- Dense tables may scroll horizontally rather than collapsing into unreadable layouts.
- Toolbars may wrap into multiple rows.
- Multi-column forms collapse to one column below the established administration breakpoint.
- Mobile layouts prioritize primary actions and essential status information.

## Phase 6.5 Implementation Sequence

1. Establish administration palette and module-card rules.
2. Remove development-only indicators and navigation arrows.
3. Standardize headers, cards, badges, loading states, and tables.
4. Introduce shared dialog and toast components.
5. Apply components across User Management, Role Management, Security, Audit, and Translation Management.
6. Add organization overview statistics.
7. Validate light mode, dark mode, responsive behavior, keyboard use, and contrast.
8. Extend shared patterns to the member experience without removing its health-focused identity.

## Change Control

Design changes that introduce a new color, spacing rule, component type, badge treatment, or interaction pattern should update this document. Reusable patterns should be implemented centrally before being copied across multiple pages.
