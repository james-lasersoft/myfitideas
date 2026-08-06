# ADR-001: Backend Domain Ownership

**Status:** Accepted

**Date:** August 6, 2026

## Context

MyFitIdeas serves a React web client today and is expected to support Android, iOS, and future integrations. Implementing validation, unit conversion, calculations, or decisions independently in each client would create inconsistent outcomes, duplicated defects, and platform-specific interpretations of the same user data.

Health and wellness calculations also require a clear authority for testing, auditability, privacy enforcement, and future change management.

## Decision

The backend is the authoritative owner of domain models and business logic.

Backend ownership includes validation, calculations, normalization, authorization, persistence, audit behavior, privacy controls, derived analytics, and service boundaries for future AI capabilities. Business rules are implemented once in a backend domain or service layer and exposed through platform-neutral APIs.

Clients collect input, manage temporary presentation state, localize content, provide accessibility, and visualize backend results. They may perform presentation-only formatting for numbers, units, dates, and times. They may not independently determine authoritative values, eligibility, interpretations, or business outcomes.

## Consequences

- Web, Android, and iOS receive consistent results.
- Business-rule changes are implemented and tested once.
- API responses require typed values, unit codes, stable statuses, and structured errors.
- Clients may need an API change rather than a local shortcut when new domain behavior is required.
- Offline experiences must reconcile drafts with backend validation before becoming authoritative.
- Backend tests carry primary responsibility for business-rule correctness.

## Alternatives considered

### Duplicate rules in each client

Rejected because implementations would drift across platforms and multiply testing and maintenance costs.

### Treat the web client as the reference implementation

Rejected because the web application is one client and contains browser-specific concerns unsuitable for mobile or integrations.

### Shared client library as the domain authority

Rejected as the primary model because it would still distribute authority, complicate non-JavaScript clients, and weaken backend enforcement.

## Implementation guidance

- Place business rules in cohesive backend domain or service modules.
- Keep controllers focused on transport, authentication context, input mapping, and response mapping.
- Enforce resource ownership and privilege checks in the backend.
- Return machine-readable statuses rather than presentation judgments.
- Mock service boundaries in frontend tests.
- Test calculations, normalization, validation, and authorization primarily in backend tests.
- Permit client calculations only when they are temporary and purely presentational.

## Related decisions

- [Architectural Constitution](../../ARCHITECTURE.md)
- [ADR-002: Multi-Client Deployment Architecture](ADR-002-multi-client-deployment-architecture.md)
- [ADR-004: Testing Strategy](ADR-004-testing-strategy.md)
