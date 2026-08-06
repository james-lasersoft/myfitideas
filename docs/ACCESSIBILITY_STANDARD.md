# MyFitIdeas Accessibility Standard

## Target

MyFitIdeas adopts WCAG 2.2 Level AA as the project-wide accessibility target.

This standard applies to customer-facing pages, administrative interfaces, developer tools, modals, forms, charts, tables, alerts, navigation, and future mobile experiences.

WCAG 2.2 AA conformance is the engineering target. It supports ADA accessibility expectations, but legal compliance also depends on testing, deployment, content, organizational practices, and jurisdiction-specific review.

## Required implementation practices

Every new or materially changed interface must:

- Use semantic HTML before ARIA.
- Provide programmatic labels for all form controls.
- Support complete keyboard operation.
- Preserve a visible focus indicator.
- Avoid keyboard traps.
- Restore focus after dialogs close.
- Use accessible modal semantics and focus management.
- Meet WCAG AA color-contrast requirements.
- Avoid using color as the only source of meaning.
- Provide text equivalents for icons and status indicators.
- Use touch targets of at least 44 by 44 CSS pixels where practical.
- Support zoom and responsive layouts without loss of content or functionality.
- Provide clear, specific, and recoverable validation messages.
- Announce important async success and error states to assistive technology.
- Respect reduced-motion preferences.
- Preserve logical heading order and reading order.
- Provide accessible names and descriptions for charts, tables, controls, and calculated values.

## ARIA rules

ARIA supplements semantic HTML. It does not replace it.

- Prefer native elements such as `button`, `input`, `select`, `fieldset`, `legend`, `table`, and `dialog`.
- Use `aria-label` only when no visible label can provide the accessible name.
- Use `aria-labelledby` when visible text already names a component.
- Use `aria-describedby` for instructions, confidence details, warnings, and validation help.
- Use `aria-live` sparingly for important dynamic updates.
- Never add roles or properties that conflict with native semantics.

## Measurement workflow requirements

The body-measurement experience must:

- Open in an accessible modal or full-screen dialog.
- Move focus into the dialog when opened.
- Keep focus within the dialog while open.
- Close with Escape when safe to do so.
- Restore focus to the Start Measurement Session control when closed.
- Expose the current step, total steps, and step title to screen readers.
- Group left and right measurements with `fieldset` and `legend`.
- Keep left and right inputs visually adjacent and programmatically grouped.
- Provide Back, Next, Skip, Review, Cancel, and Save actions with clear accessible names.
- Never rely on color alone for confidence, validation, or completion states.
- Treat body-fat percentage, lean mass, fat mass, waist-to-height ratio, and similar values as derived results rather than routine manual inputs.

## Confidence indicators

Each derived value may display a compact information control whose color reflects confidence.

The control must also provide:

- A visible or programmatic confidence label such as High, Moderate, Low, or Unavailable.
- An accessible name such as `High confidence. View body fat calculation details`.
- Keyboard access.
- A tooltip, popover, or dialog containing the calculation method, required inputs, missing inputs, observation timing, and reasons for the confidence level.
- A non-color visual distinction or text label.

## Testing expectations

Before a feature is considered complete, test:

- Keyboard-only operation.
- Screen-reader announcements for primary workflows.
- Focus order and focus restoration.
- Color contrast.
- 200 percent zoom.
- Mobile portrait and landscape layouts.
- Reduced-motion behavior.
- Error identification and recovery.

Automated accessibility testing should be added to CI where practical, but automated checks do not replace manual testing.

## Definition of done

A feature is not complete until its accessibility behavior has been reviewed alongside functionality, security, privacy, localization, and responsive design.
