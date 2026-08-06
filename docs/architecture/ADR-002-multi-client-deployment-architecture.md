# ADR-002: Multi-Client Deployment Architecture

**Status:** Accepted

**Date:** August 6, 2026

## Context

MyFitIdeas combines public content, member experiences, privileged administration, shared APIs, operational status, and private monitoring. These surfaces have different audiences, authentication needs, security policies, release cadences, and exposure risks. Future Android and iOS applications must use the same backend capabilities as the web client.

A single browser-oriented deployment would couple releases and blur trust boundaries. Separate domains alone, however, cannot enforce data ownership or privilege.

## Decision

Adopt independently deployable surfaces with a shared platform-neutral backend:

- `myfitideas.com` for marketing and public content
- `app.myfitideas.com` for the member web client
- `admin.myfitideas.com` for the privileged administrative client
- `api.myfitideas.com` for the shared backend API
- `auth.myfitideas.com` for centralized identity when introduced
- `status.myfitideas.com` for sanitized public status
- Internal monitoring behind VPN, zero-trust access, or an identity-aware proxy

Android, iOS, web, and approved integrations consume the same typed API contracts.

Subdomain separation is used for cookie isolation, content security policies, release isolation, and reduced exposure. It does not replace backend authentication or authorization. Administrative access requires stricter controls, comprehensive audit logging, and preferably mandatory multi-factor authentication.

Production, staging, development, and test environments use isolated credentials, databases, origins, and deployment resources.

## Consequences

- Public, member, and administrative clients can release independently.
- Cross-origin, cookie, and authentication policies require explicit design.
- API compatibility and versioning become important across client release cycles.
- Privileged administration gains a smaller and more defensible exposure surface.
- Operational status can remain public without exposing private monitoring data.
- More deployment surfaces increase infrastructure and observability responsibilities.

## Alternatives considered

### One web application and one origin

Rejected as the target because it couples privileged and public concerns and reduces release isolation.

### Separate backend per client

Rejected because it would duplicate domain logic and produce inconsistent contracts.

### Publicly exposed monitoring

Rejected because operational detail can reveal sensitive topology, usage, or failure information.

## Implementation guidance

- Use stable identifiers, typed fields, ISO 8601 timestamps, unit codes, and structured errors.
- Avoid HTML, CSS assumptions, browser session state, and preformatted English business messages in APIs.
- Enforce authorization in the API for every client and resource.
- Design cookie scope narrowly and use explicit cross-origin policies.
- Require stronger authentication and audited privilege changes for administration.
- Keep public status sanitized and private telemetry access-controlled.
- Test environment configuration independently and prohibit routine data sharing between environments.
- Maintain backward-compatible contracts or explicit API versions for independently released clients.

## Related decisions

- [Architectural Constitution](../../ARCHITECTURE.md)
- [ADR-001: Backend Domain Ownership](ADR-001-backend-domain-ownership.md)
- [ADR-005: Privacy and Compliance by Design](ADR-005-privacy-and-compliance-by-design.md)
