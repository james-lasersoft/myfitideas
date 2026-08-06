# Contributing to MyFitIdeas

This document is the authoritative contribution workflow for MyFitIdeas. It complements the [architectural constitution](ARCHITECTURE.md) and the existing [development and merge checklist](docs/development-checklist.md). Where the older checklist recommends squash merging, this document supersedes that merge-strategy guidance.

## Development environment

The repository is commonly developed on Windows through Ubuntu WSL2. Run repository, Git, Node.js, npm, Prisma, and shell commands inside WSL. Prefer Linux executables such as `/usr/bin/npm` and `/usr/bin/npx`. Do not mix mounted Windows executables into a WSL dependency tree.

Install each package independently:

```bash
cd src/backend
/usr/bin/npm ci

cd ../frontend
/usr/bin/npm ci
```

Never commit credentials, secrets, `.env` files, generated reports, coverage output, build output, Playwright artifacts, authenticated browser state, or other local environment files.

## Git workflow

`development` is the stable integration branch. `main` is the release branch. Routine development must not occur directly on either branch. Direct changes require explicit approval for emergency work.

Start each task from current `development`:

```bash
/usr/bin/git switch development
/usr/bin/git fetch origin
/usr/bin/git pull --ff-only origin development
/usr/bin/git status --short --branch
```

Create one focused branch per task:

```bash
/usr/bin/git switch -c feature/example-description
```

Supported branch prefixes include:

- `feature/<description>`
- `fix/<description>`
- `test/<description>`
- `docs/<description>`
- `refactor/<description>`

Implement and validate only the requested scope. Preserve unrelated working-tree changes and never include them silently. Stage explicit paths rather than relying on a broad staging command when the worktree contains unrelated files.

Use conventional commit titles, for example:

```text
feat(measurements): add session comparison
fix(ci): provide Prisma database URL
test(measurements): cover keyboard navigation
docs: establish architecture guidelines
refactor(measurements): extract session components
```

Keep commits focused. Push the branch and open a pull request into `development`. Routine pull requests may be merged automatically after validation when that action is authorized. Use a regular merge commit unless another method is explicitly required. Standard merge titles are:

- `merge(feature): <description> (#<pr>)`
- `merge(fix): <description> (#<pr>)`
- `merge(docs): <description> (#<pr>)`
- `merge(test): <description> (#<pr>)`
- `merge(refactor): <description> (#<pr>)`

Apply appropriate existing GitHub labels. Delete merged task branches unless retention is explicitly requested. After every merge, update the local integration branch:

```bash
/usr/bin/git switch development
/usr/bin/git fetch origin
/usr/bin/git pull --ff-only origin development
```

## Architecture boundaries

The backend owns authoritative domain models, validation, calculations, normalization, authorization, persistence, audit behavior, privacy controls, and derived analytics. APIs must remain platform-neutral for web, Android, iOS, and future integrations.

Frontend clients collect input, manage temporary presentation state, localize content, provide accessible interactions, and visualize backend results. They may format numbers, units, dates, and times for display. They must not duplicate authoritative backend business rules or calculations.

See [ARCHITECTURE.md](ARCHITECTURE.md) and the [ADR index](docs/architecture/README.md) before changing a system boundary.

## Backend validation

Run backend commands from `src/backend`.

```bash
cd src/backend
/usr/bin/npm run typecheck
/usr/bin/npm test
/usr/bin/npm run build
```

Backend tests cover domain rules, services, controllers, API behavior, authorization, and database integration where applicable. Privileged operations and user-owned resources require tests proving that the backend rejects unauthorized access and does not expose another user's data.

Bug fixes should include a regression test where practical. Fixtures must be deterministic. Automated tests must not use production data or connect to production databases.

## Frontend validation

Run frontend commands from `src/frontend`.

```bash
cd src/frontend
/usr/bin/npm test
/usr/bin/npm run lint
/usr/bin/npm run build
/usr/bin/npm run check:i18n
/usr/bin/npm run extract:i18n
```

`npm test` runs Vitest unit and component tests. These tests cover presentation, interaction, accessibility behavior, and mocked service boundaries. They must not reimplement backend business logic merely to test it again.

`npm run test:e2e` runs the configured Playwright desktop and mobile Chromium projects:

```bash
cd src/frontend
/usr/bin/npm run test:e2e
```

Playwright covers critical full-stack browser workflows. It uses deterministic `.test` fixtures and may reuse services already listening on ports 5173 and 3000. Follow [the frontend testing instructions](src/frontend/README.md) before running the suite.

Manual browser review is separate from automated testing. Use it for material presentation changes, responsive layouts, keyboard flows, focus behavior, visual regressions, and browser console errors. Manual review does not replace Vitest or Playwright coverage.

## Internationalization

Every user-visible frontend string must go through the translation engine. This includes headings, labels, buttons, placeholders, validation messages, errors, statuses, tooltips, captions, generated summaries, `aria-label` values, and screen-reader text.

Each new source requires an English-source catalog entry and a Brazilian Portuguese translation. Reuse an existing key when the meaning is identical. Both commands must complete with zero findings:

```bash
cd src/frontend
/usr/bin/npm run check:i18n
/usr/bin/npm run extract:i18n
```

Backend errors should prefer stable, machine-readable codes or statuses that clients can localize. APIs must not depend on preformatted English business messages.

## Accessibility and responsive behavior

New and changed interfaces must provide:

- Keyboard access for every interactive operation
- Visible and logical focus management
- Focus trapping and restoration for modal dialogs
- Escape and explicit Close behavior where appropriate
- Native or semantically correct controls
- Programmatic labels and meaningful accessible names
- Logical heading and table structures
- Status and error announcements
- Responsive behavior without hiding required information
- Practical touch targets and sufficient color contrast

Follow the [accessibility standard](docs/ACCESSIBILITY_STANDARD.md) and [UI component standards](docs/architecture/UI_COMPONENT_STANDARDS.md).

## Database changes

Schema changes require additive Prisma migrations that are reviewed and tested against a non-production database. Review generated SQL, compatibility with existing data, unit assumptions, recovery needs, and deployment ordering.

The repository does not define an npm migration script. Use the installed Prisma CLI from `src/backend`:

```bash
cd src/backend
/usr/bin/npx prisma generate
/usr/bin/npx prisma migrate dev
/usr/bin/npx prisma migrate status
```

Do not invent migration scripts or run routine local and CI tests against development, staging, or production databases. Use a disposable database only when a test or migration genuinely requires a live database.

## Git validation

Before committing, review the complete diff and run:

```bash
/usr/bin/git diff --check
/usr/bin/git status --short
```

Confirm that only intended files are staged. Generated files, reports, test artifacts, credentials, secrets, and local environment files must remain uncommitted.

## Pull request requirements

Use a conventional PR title that describes the full change. Apply appropriate existing labels and include:

- Summary and scope
- Architecture impact
- Database impact
- Translation impact
- Privacy impact
- Validation commands and results
- Known limitations or follow-up work
- Screenshots when presentation changes materially

A pull request targets `development` and merges only after the applicable automated and manual validation passes. Review comments and failing checks must be resolved or explicitly explained before merge.
