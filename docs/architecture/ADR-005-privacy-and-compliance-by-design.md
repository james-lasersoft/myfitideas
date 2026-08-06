# ADR-005: Privacy and Compliance by Design

**Status:** Accepted

**Date:** August 6, 2026

## Context

MyFitIdeas processes body measurements, goals, hydration, nutrition, account information, and derived wellness analytics. Users reasonably consider this information sensitive. Applicable obligations may include CCPA/CPRA, GDPR, LGPD, contractual requirements, and other regional rules depending on users, processing purposes, and deployment.

Future voice and AI capabilities could introduce additional data, processors, retention risks, and user expectations. Architecture must support privacy obligations without making unsupported legal claims.

## Decision

Apply privacy and compliance by design across data models, APIs, clients, infrastructure, and operational processes.

The platform supports:

- Data minimization and collection limited to defined purposes
- Purpose limitation and clear user communication
- Consent or another valid processing basis where required
- Configurable retention and defensible deletion
- User access, export, correction, and deletion workflows
- Least-privilege access control
- Encryption in transit and at rest where applicable
- Auditable privileged and privacy-sensitive operations
- Regional processing and transfer considerations
- Controlled third-party processing and vendor review

Health and wellness data is treated as sensitive. MyFitIdeas does not claim HIPAA compliance or any other legal compliance status without verified technical, organizational, contractual, and legal evidence. General wellness features must not be presented as regulated medical diagnosis or treatment.

Future voice input requires explicit activation, preferably push-to-talk. Passive listening is not introduced initially. Voice input produces a reviewable structured draft and never bypasses user confirmation or backend validation. Raw audio is not retained by default. Any third-party processing is disclosed, minimized, contractually reviewed, and accompanied by transcript retention controls.

Future AI features use the minimum necessary data, consume explainable backend-derived source metrics, and produce human-reviewable outputs. AI is not a source of truth and must not make unsupported medical diagnoses.

Legal review is required before production claims of compliance.

## Consequences

- New features require privacy-impact review, not only functional review.
- Data inventories, retention rules, and processing purposes must stay current.
- Export, correction, and deletion affect domain and audit design.
- Some audit records may require carefully justified retention after operational data deletion.
- Regional deployment or transfer controls may become necessary.
- Voice and AI vendors require technical, contractual, and privacy assessment.
- Product language must distinguish wellness guidance from medical claims.

## Alternatives considered

### Add privacy controls after product growth

Rejected because retrofitting consent, deletion, retention, and purpose boundaries is risky and expensive.

### Treat wellness data as ordinary profile data

Rejected because user expectations and potential regulatory obligations require stronger care.

### Retain raw voice audio for convenience

Rejected as the default because it increases sensitivity, breach impact, and processing obligations.

### Let AI operate directly on unrestricted records

Rejected because it weakens minimization, explainability, authorization, and user trust.

## Implementation guidance

- Document each data category, purpose, owner, retention rule, and authorized consumer.
- Collect only fields required for the declared feature.
- Enforce user ownership and privilege checks in backend APIs.
- Encrypt transport and protect stored secrets and sensitive data.
- Audit privileged access, exports, corrections, deletions, and policy changes.
- Design export and deletion workflows across primary, derived, cached, and third-party data.
- Separate public status from private operational telemetry.
- Review regional hosting, subprocessors, and international transfer mechanisms before launch.
- Require explicit voice activation and visible recording state.
- Prefer transient audio processing and configurable transcript retention.
- Ground AI output in identified backend metrics and show users reviewable results.
- Obtain legal review before publishing compliance claims or entering regulated medical use cases.

## Related decisions

- [Architectural Constitution](../../ARCHITECTURE.md)
- [ADR-001: Backend Domain Ownership](ADR-001-backend-domain-ownership.md)
- [ADR-002: Multi-Client Deployment Architecture](ADR-002-multi-client-deployment-architecture.md)
- [ADR-004: Testing Strategy](ADR-004-testing-strategy.md)
