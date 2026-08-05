# MyFitIdeas Workspace Design System

## Canonical source

The machine-readable color source is:

`branding/brand-v1.0/tokens/brand-tokens.json`

All future workspace styling should use those values directly or map application CSS variables to them. New workspace colors must be added to that token file before use in production code.

## Shared brand foundation

The original Brand v1.0 palette remains authoritative for the member-facing product:

- Deep Stem: `#1F8B43`
- Top Leaf: `#48BE30`
- Growth: `#5FCB3C`
- Spring Bud: `#A6E84A`
- Charcoal: `#263238`
- Morning Dew: `#F5FDF0`
- White: `#FFFFFF`

The MyFitIdeas wordmark uses Noto Sans Display SemiBold as its source design and outlined vector paths in production assets.

## Personal workspace

### Purpose

The Personal workspace supports health tracking, body transformation, progress review, and personal account activity.

### Visual character

- Encouraging and health-focused
- Green-led brand identity
- Softer page backgrounds and rounded surfaces
- Clear progress, goal, and action hierarchy
- Lower information density than administrative screens

### Canonical tokens

- Primary: `#1F8B43`
- Header gradient start: `#176D34`
- Header gradient end: `#1F8B43`
- Accent: `#48BE30`
- Growth accent: `#5FCB3C`
- Highlight: `#A6E84A`
- Background: `#F5FDF0`
- Surface: `#FFFFFF`
- Text: `#263238`

### Usage rules

- Use green for primary actions, focus states, progress indicators, and active member navigation.
- Use Morning Dew for subtle page tinting, not for text.
- Use Spring Bud sparingly for highlights and positive emphasis.
- The member top bar should retain the green gradient defined above.
- Account navigation remains neutral and should not compete with health-task content.

## Administration workspace

### Purpose

The Administration workspace supports business operations, user and role management, security operations, auditing, translation management, and company configuration.

### Visual character

- Professional and operational
- Blue and slate visual identity
- Higher information density
- Structured tables and configuration panels
- Reduced decorative emphasis
- Clear separation from the Personal workspace

### Canonical tokens

- Primary: `#17324F`
- Header gradient start: `#17324F`
- Header gradient end: `#244866`
- Secondary: `#244866`
- Slate: `#334155`
- Background: `#F7F9FC`
- Surface: `#FFFFFF`
- Text: `#1F2937`

### Usage rules

- Use blue and slate for administrative navigation, focus states, primary controls, and active administrative context.
- Do not replace the Administration palette with member green except where the MyFitIdeas logo itself requires brand colors.
- Use neutral surfaces and tighter spacing for tables, audit records, and system-management screens.
- The Administration top bar should retain the blue gradient defined above.
- Access to Administration is exposed through the workspace selector, not duplicated in the account menu.

## Shared interaction rules

Both workspaces share:

- Typography
- Spacing scale
- Border-radius system
- Form-control behavior
- Dialog behavior
- Accessibility requirements
- Responsive breakpoints
- Motion and reduced-motion behavior
- Error, warning, success, and informational semantics

Workspace identity changes color and density, not core interaction behavior.

## Workspace selector

The workspace selector is the canonical route between Personal and Administration.

- Personal should be represented with the member green identity.
- Administration should be represented with the blue/slate identity.
- Users without administrative access should not see Administration as an available workspace.
- Future workspaces must define their tokens in `brand-tokens.json` before being added to the selector.

## Future workspaces

Coach, analytics, support, or trainer workspaces may introduce additional accent palettes. They must inherit the shared design language and document their purpose, canonical tokens, and usage rules in this file.

## Change control

When changing workspace colors:

1. Update `brand-tokens.json` first.
2. Update this document if the meaning or usage changes.
3. Map the frontend CSS variables to the updated tokens.
4. Validate light mode, dark mode, responsive layouts, focus visibility, and text contrast.
5. Avoid introducing page-specific color values when an existing token applies.
