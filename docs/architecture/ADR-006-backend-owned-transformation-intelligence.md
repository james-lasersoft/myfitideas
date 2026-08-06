# ADR-006: Backend-Owned Transformation Intelligence

**Status:** Accepted

**Date:** August 6, 2026

## Context

Body weight and circumference observations can support factual summaries of change over time. Web, Android, and iOS clients must receive the same results, including unit normalization, missing-data handling, period boundaries, and data-sufficiency indicators. Reimplementing these rules in each client would create inconsistent and difficult-to-audit behavior.

Body measurements and derived composition values are sensitive wellness data. Transformation summaries must avoid medical interpretation, value judgments, and unsupported confidence.

## Decision

The backend is the sole authority for body-transformation analytics.

An authenticated, platform-neutral endpoint returns a fixed-size response for a requested rolling, all-history, or custom period. The backend:

- scopes body-weight observations and measurement sessions to the authenticated user;
- normalizes compatible stored units to the user's display units;
- returns start and end values, absolute and percentage change, observation dates and counts, direction, and reliability for each metric;
- treats left and right measurements independently;
- keeps missing values null rather than imputing them;
- reports derived body-fat, waist-to-height, fat-mass, and lean-mass trends only when their stored calculation metadata establishes availability;
- reports factual recording coverage for weight days and measurement-session weeks; and
- uses stable machine-readable enums and ISO 8601 timestamps.

Reliability is determined only by the count of available observations for an individual metric:

- zero observations: `UNAVAILABLE`;
- one observation: `CURRENT_ONLY`;
- two observations: `BASIC_CHANGE`; and
- three or more observations: `TREND_ELIGIBLE`.

Direction compares the normalized first and last values. Equal values are `STABLE`; positive and negative changes are `INCREASING` and `DECREASING`. With fewer than two observations, direction is `INSUFFICIENT_DATA`. Percentage change is null when the starting value is zero.

Clients may localize labels, dates, and backend-provided numeric values. Clients do not recalculate, reinterpret, rank, or characterize changes.

## Consequences

- All clients show consistent calculations and sufficiency states.
- The endpoint remains reusable outside browser interfaces.
- Adding a metric or changing a calculation rule requires backend tests and an API-contract review.
- Request-time aggregation reads only the minimum records and fields needed for the selected user and period.
- The fixed-size response does not require pagination even though its source history may grow.
- Trend eligibility communicates data sufficiency, not statistical or medical confidence.
- The feature makes no claim that an increase, decrease, or recording pattern is good, bad, healthy, or unhealthy.

## Alternatives considered

### Calculate trends in React

Rejected because it duplicates domain rules in a presentation client and cannot be reused safely by mobile clients.

### Persist every summary value

Rejected for Phase 1 because request-time deterministic aggregation avoids redundant sensitive data and stale derived records.

### Impute missing measurements

Rejected because invented values would obscure data quality and could mislead users.

### Add generated interpretations

Rejected because Phase 1 is limited to explainable factual analytics and does not introduce generative AI or medical guidance.

## Implementation guidance

- Keep calculation functions pure and cover thresholds, units, missing values, period boundaries, and zero baselines with backend unit tests.
- Enforce authentication, entitlement, permission, and user ownership before returning analytics.
- Return enums and numeric fields, not preformatted English sentences or HTML structures.
- Preserve nulls and independent left/right sufficiency.
- Update OpenAPI whenever response fields or enums change.
- Treat new derived metrics as domain changes requiring a new or superseding ADR when the governing rules materially change.

## Related decisions

- [Architectural Constitution](../../ARCHITECTURE.md)
- [ADR-001: Backend Domain Ownership](ADR-001-backend-domain-ownership.md)
- [ADR-002: Multi-Client Deployment Architecture](ADR-002-multi-client-deployment-architecture.md)
- [ADR-003: Internationalization First](ADR-003-internationalization-first.md)
- [ADR-004: Testing Strategy](ADR-004-testing-strategy.md)
- [ADR-005: Privacy and Compliance by Design](ADR-005-privacy-and-compliance-by-design.md)
