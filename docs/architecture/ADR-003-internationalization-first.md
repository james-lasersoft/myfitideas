# ADR-003: Internationalization First

**Status:** Accepted

**Date:** August 6, 2026

## Context

MyFitIdeas serves users through multiple clients and supports English-source content and Brazilian Portuguese. Adding localization after an interface is complete leaves hidden strings, inaccessible labels, unstable tests, and backend messages that clients cannot translate consistently.

User-visible content includes more than headings and buttons. Validation, errors, placeholders, statuses, tooltips, captions, generated summaries, accessible names, and screen-reader announcements all affect the experience.

## Decision

All user-visible client strings use the existing translation engine from their first implementation.

Every new source has an English-source catalog entry and a Brazilian Portuguese translation. Existing keys are reused when meaning is identical. Dynamic messages preserve interpolation values and plural behavior.

Backend APIs prefer stable machine-readable error codes, statuses, identifiers, and typed fields. Clients localize those values. APIs do not return preformatted English business messages as their contract.

The frontend localization guard and extraction commands must report zero findings before merge.

## Consequences

- English and Brazilian Portuguese remain complete as features evolve.
- Accessible content is localized with visible content.
- Backend contracts remain reusable across web, Android, and iOS.
- Contributors must update catalogs with user-interface changes.
- Tests should use stable roles, labels, or controlled locale setup rather than fragile incidental copy.
- Generated summaries require explicit templates and interpolation coverage.

## Alternatives considered

### Localize after feature completion

Rejected because missing sources become harder to identify and accessibility content is often overlooked.

### Put translated sentences in backend responses

Rejected because it couples APIs to locale and presentation concerns and reduces mobile reuse.

### Permit hard-coded English fallback in components

Rejected for normal user-visible content because fallback conventions already belong in the translation system.

## Implementation guidance

- Route headings, labels, buttons, helper text, placeholders, errors, confirmations, statuses, tooltips, captions, table headers, empty states, `aria-label` values, and screen-reader text through the translation engine.
- Add English-source and Brazilian Portuguese catalog entries.
- Preserve interpolation placeholders exactly across locales.
- Return machine-readable backend statuses and error codes.
- Run from `src/frontend`:

  ```bash
  /usr/bin/npm run check:i18n
  /usr/bin/npm run extract:i18n
  ```

- Require zero findings and review extraction output.
- Mock published translation boundaries in focused frontend tests where needed.
- Treat intentional non-translated identifiers as explicit, reviewed exceptions.

## Related decisions

- [Architectural Constitution](../../ARCHITECTURE.md)
- [ADR-001: Backend Domain Ownership](ADR-001-backend-domain-ownership.md)
- [ADR-004: Testing Strategy](ADR-004-testing-strategy.md)
