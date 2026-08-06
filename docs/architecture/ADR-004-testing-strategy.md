# ADR-004: Testing Strategy

**Status:** Accepted

**Date:** August 6, 2026

## Context

MyFitIdeas contains backend domain logic, authorization, persistence, React presentation, localized interactions, and critical browser workflows. A single testing layer cannot cover these concerns efficiently. Duplicating backend calculations in frontend tests would validate a second implementation instead of the source of truth.

CI also loads Prisma configuration before generating the client. Prisma generation may require `DATABASE_URL` to exist syntactically even when it does not open a database connection.

## Decision

Use a testing pyramid with clear ownership:

1. Backend domain and service tests cover business rules, calculations, normalization, and derived analytics.
2. Backend API and database integration tests cover transport contracts, authorization, ownership, persistence, and migrations.
3. Vitest unit and component tests cover frontend presentation, interactions, accessibility behavior, and mocked service boundaries.
4. Playwright covers critical full-stack workflows in desktop and mobile browsers.
5. Manual accessibility and visual review supplements automation for presentation changes.

Business rules are primarily tested in the backend. Vitest must not duplicate backend business logic. Playwright focuses on high-value end-to-end behavior rather than exhaustive permutations.

Fixtures are deterministic, isolated, and prohibited from using production data.

For CI, Prisma generation may use a non-sensitive, syntactically valid placeholder `DATABASE_URL` when generation does not require a live connection. Add a disposable PostgreSQL service with health checks only when tests or migrations genuinely require database access. Routine CI must never use development, staging, or production database credentials.

## Consequences

- Fast tests cover most behavior close to its source.
- Full-stack tests provide confidence in critical integration paths.
- Database integration coverage requires explicit disposable infrastructure.
- Frontend tests remain focused on client responsibilities.
- CI configuration must distinguish tools that parse connection settings from tests that connect.
- Manual review remains necessary for some accessibility and visual qualities.

## Alternatives considered

### End-to-end tests for all behavior

Rejected because they are slower, harder to diagnose, and costly for business-rule permutations.

### Frontend tests for backend calculations

Rejected because they duplicate authority and can pass while the backend behaves differently.

### Always start PostgreSQL in CI

Rejected because it adds latency and maintenance when generation and mocked tests do not connect.

### Use a shared non-production database

Rejected because shared state causes nondeterminism and risks data leakage across environments.

## Implementation guidance

- Run backend typecheck, tests, and build from `src/backend`.
- Run Vitest, lint, build, localization checks, and extraction from `src/frontend`.
- Use Playwright for authentication, core measurement workflows, accessibility-critical dialogs, localization, and responsive mobile behavior.
- Add regression tests for bug fixes where practical.
- Seed only reserved deterministic test identities and narrowly scoped fixture data.
- Use disposable databases for integration and migration testing.
- Verify ownership and privilege failures as well as success paths.
- Set CI placeholder connection strings at workflow or job scope and never include real credentials.
- Add database services only when observed test behavior requires them.

## Related decisions

- [Contributing Guidelines](../../CONTRIBUTING.md)
- [ADR-001: Backend Domain Ownership](ADR-001-backend-domain-ownership.md)
- [ADR-003: Internationalization First](ADR-003-internationalization-first.md)
- [ADR-005: Privacy and Compliance by Design](ADR-005-privacy-and-compliance-by-design.md)
