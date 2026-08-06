# MyFitIdeas Architecture Decision Records

The project-wide architectural constitution is [`ARCHITECTURE.md`](../../ARCHITECTURE.md). Contribution and validation requirements are in [`CONTRIBUTING.md`](../../CONTRIBUTING.md).

## ADR index

| ADR | Decision | Status |
|---|---|---|
| [ADR-001](ADR-001-backend-domain-ownership.md) | Backend Domain Ownership | Accepted |
| [ADR-002](ADR-002-multi-client-deployment-architecture.md) | Multi-Client Deployment Architecture | Accepted |
| [ADR-003](ADR-003-internationalization-first.md) | Internationalization First | Accepted |
| [ADR-004](ADR-004-testing-strategy.md) | Testing Strategy | Accepted |
| [ADR-005](ADR-005-privacy-and-compliance-by-design.md) | Privacy and Compliance by Design | Accepted |
| [ADR-006](ADR-006-backend-owned-transformation-intelligence.md) | Backend-Owned Transformation Intelligence | Accepted |

The older [`Design-Decisions.md`](Design-Decisions.md) predates this indexed ADR series and remains a product terminology record. New architecture decisions use the numbered files in this index.

## ADR lifecycle

### Proposed

Create a new ADR from the next available number. Document the context, proposed decision, consequences, alternatives, implementation guidance, and related decisions. Open a pull request into `development` for technical and product review.

### Accepted

Set the status to `Accepted` after the decision is approved and merged. Accepted ADRs describe the governing decision from that point forward.

### Superseded

Do not rewrite an accepted decision to hide a material architectural change. Create a new ADR, set the old ADR status to `Superseded by ADR-NNN`, and link both records.

### Deprecated

Set an ADR to `Deprecated` when its guidance is intentionally retired without a direct replacement. Add the reason and effective date while preserving the original decision history.

Guiding architectural premises change through a new ADR rather than silent edits to accepted history. Minor corrections that do not alter meaning may be made directly through normal review.
