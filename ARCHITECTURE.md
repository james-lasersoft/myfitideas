# MyFitIdeas Architectural Constitution

MyFitIdeas is a multi-platform SaaS body transformation platform. The current React web application is the first client, not the system itself. Future Android and iOS applications and approved integrations consume the same backend contracts.

This constitution defines the stable architectural premises for the project. Detailed decisions are indexed in [`docs/architecture/`](docs/architecture/README.md).

## Primary principle

The backend owns authoritative business models and business logic. Clients collect input and visualize backend results.

Clients must not independently implement authoritative calculations, validation rules, normalization, interpretations, or business decisions. A client may format numbers, units, dates, and times for localized display, and may calculate temporary presentation state that has no business authority.

## Backend responsibilities

The backend owns:

- Domain models
- Input and state validation
- Business calculations
- Unit and data normalization
- Authentication and authorization enforcement
- Persistence and transaction boundaries
- Audit behavior
- Privacy controls
- Derived analytics
- Stable boundaries for future intelligence and AI services

Business rules should be implemented once in a backend domain or service boundary and tested there. The backend is the source of truth even when a client performs optimistic or temporary presentation updates.

## Client responsibilities

Web, Android, and iOS clients own:

- Visualization of backend data
- User interaction and input collection
- Keyboard, screen-reader, touch, and responsive accessibility
- Localization of user-visible content
- Temporary presentation state
- Localized number, unit, date, and time formatting
- Clear review and confirmation experiences

Clients call platform-neutral APIs and render the returned typed values and statuses. They do not become alternate sources of domain truth.

## API contracts

Shared APIs must support web, Android, iOS, and future integrations without browser assumptions. Contracts should return:

- Stable identifiers
- Typed fields
- Machine-readable statuses
- ISO 8601 date and time values
- Explicit unit codes
- Structured errors and stable error codes
- Versionable, platform-neutral resources

Contracts should not return:

- HTML-oriented structures
- CSS or layout assumptions
- Browser-specific state
- Preformatted English business messages

Authorization is enforced for every request at the backend boundary. Hiding a control in a client is not authorization.

## Backend domains

The backend should evolve as cohesive modules with explicit contracts. Domain examples include:

- Identity
- Users
- Measurements
- Nutrition
- Hydration
- Goals
- Analytics
- Administration
- Localization
- Privacy
- Audit

Cross-domain behavior should use explicit service boundaries rather than direct client coordination or duplicated rules.

## Deployment surfaces

The target deployment architecture separates audiences and release surfaces:

| Surface | Responsibility |
|---|---|
| `myfitideas.com` | Marketing and public content |
| `app.myfitideas.com` | Member web client |
| `admin.myfitideas.com` | Privileged administrative client |
| `api.myfitideas.com` | Shared platform-neutral backend API |
| `auth.myfitideas.com` | Centralized identity when introduced |
| `status.myfitideas.com` | Sanitized public service status |
| Private monitoring | Operational data behind VPN, zero-trust access, or an identity-aware proxy |

Subdomain separation improves cookie isolation, security policy boundaries, release isolation, and operational clarity. It does not replace backend authorization.

Administrative access requires stricter authentication and authorization, comprehensive audit logging, and preferably mandatory multi-factor authentication. Production, staging, development, and test environments remain isolated. Credentials and data must not cross those boundaries casually.

## Internationalization first

User-visible content uses the translation engine from its first implementation. English-source and Brazilian Portuguese catalog coverage are required. Backend responses favor machine-readable statuses and error codes so each client can localize messages consistently.

Localization includes visible copy, validation, placeholders, tooltips, statuses, generated summaries, accessible names, and screen-reader text.

## Accessibility first

Accessibility is a functional requirement. Interfaces support keyboard navigation, visible focus, semantic controls, programmatic labels, focus-managed dialogs, screen-reader announcements, responsive layouts, practical touch targets, sufficient contrast, and reduced-motion preferences where applicable.

## Testing

Business rules are primarily tested in backend domain, service, API, authorization, and database integration tests. Frontend unit and component tests use Vitest for presentation and interaction behavior with mocked service boundaries. Playwright verifies critical full-stack workflows in desktop and mobile browsers. Manual accessibility and visual review supplements automation.

Fixtures are deterministic and isolated. Automated validation never uses production data or production database credentials.

## Security and observability

Security is enforced at backend trust boundaries through authentication, authorization, validation, least privilege, secure secret handling, and auditability. Privileged administration receives additional protection.

Observability should produce structured, privacy-aware logs, metrics, and traces. Public status exposes only sanitized operational information. Internal diagnostics remain behind controlled access and must avoid unnecessary sensitive data.

## Privacy by design

Health and wellness information is sensitive even when it is not regulated medical data. The platform applies data minimization, purpose limitation, access control, retention controls, export, correction, deletion, encryption, and auditability according to applicable requirements.

MyFitIdeas must not claim HIPAA compliance or any other legal compliance status without verified evidence and legal review. Product language must distinguish general wellness capabilities from regulated medical functions.

## Future voice and AI capabilities

Future voice entry requires explicit activation, preferably push-to-talk. It produces a reviewable structured draft and never bypasses user confirmation or backend validation. Raw audio is not retained by default.

Future intelligence and AI features consume backend-derived analytics through explicit service boundaries. They are not independent sources of truth, do not bypass authorization or privacy controls, and must not present unsupported medical diagnoses.
