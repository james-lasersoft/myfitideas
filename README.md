# My Fit Ideas

Personal Body Progress Tracker capstone project for MSIT 5910.

## Project scope

The current minimum viable product focuses on:

- User authentication
- Body measurement tracking
- Hydration tracking
- Dashboard summaries
- PostgreSQL data storage

Future development will preserve a platform-neutral backend for the React web client and a native Android client.

## Technology stack

- React and TypeScript frontend
- Vite development and build tooling
- Node.js, Express, and TypeScript REST API
- Prisma ORM
- PostgreSQL database
- GitHub version control

## Repository structure

```text
docs/
design/
database/
src/
  backend/
  frontend/
```

## Local development

### Prerequisites

- Node.js and npm
- PostgreSQL
- Git

### Start the backend

```bash
cd src/backend
npm install
cp .env.example .env
# Set DATABASE_URL and JWT_SECRET in .env
npx prisma generate
npx prisma migrate dev
npm run dev
```

The API uses port `3000` by default.

### Start the frontend

In a second terminal:

```bash
cd src/frontend
npm install
cp .env.example .env
npm run dev
```

The frontend defaults to `http://localhost:3000` for the API unless `VITE_API_URL` is changed.

## Validation

Backend:

```bash
cd src/backend
npm run typecheck
npm test
npm run build
```

Frontend:

```bash
cd src/frontend
npm run lint
npm run build
```

## Development workflow

- Keep `main` stable.
- Create feature branches from the latest stable target branch.
- Review database migrations before merging.
- Run automated validation and manual smoke tests.
- Update documentation when the schema, API, environment variables, or startup process changes.

See:

- [`docs/current-system-baseline.md`](docs/current-system-baseline.md)
- [`docs/development-checklist.md`](docs/development-checklist.md)

## Future enhancements

Planned future work includes API versioning, canonical metric storage, multilingual support, translation administration, RBAC, subscription entitlements, company administration, hosted billing, AWS deployment, and an Android application.
