# MyFitIdeas Current System Baseline

Reference date: July 2026

This document records the stable baseline before the next development phases. The `main` branch remains the release branch. New work should be completed on feature branches and merged only after testing.

## Current architecture

- Frontend: React, TypeScript, Vite
- Backend: Node.js, Express, TypeScript
- Database access: Prisma ORM
- Database: PostgreSQL
- Authentication: JWT bearer token
- Repository: GitHub

The web frontend and future Android client should use the same platform-neutral backend API. Business rules, validation, authorization, unit conversion, and subscription enforcement should remain in the backend.

## Repository structure

```text
docs/
design/
database/
src/
  backend/
  frontend/
```

## Current database schema

### User

- `id`: UUID primary key
- `email`: unique string
- `passwordHash`: hashed password
- `firstName`: required string
- `lastName`: optional string
- `heightCm`: optional number
- `preferredWeightUnit`: string, default `lb`
- `preferredHydrationUnit`: string, default `oz`
- `dailyHydrationGoal`: number, default `64`
- `targetWeight`: optional number
- `createdAt`: timestamp
- `updatedAt`: timestamp

### Measurement

- `id`: UUID primary key
- `userId`: owning user
- `weight`: optional number
- `waist`: optional number
- `chest`: optional number
- `hips`: optional number
- `bodyFat`: optional number
- `measurementDate`: timestamp
- `createdAt`: timestamp
- `updatedAt`: timestamp

### Hydration

- `id`: UUID primary key
- `userId`: owning user
- `amount`: number
- `unit`: string, default `oz`
- `loggedAt`: timestamp
- `createdAt`: timestamp
- `updatedAt`: timestamp

Important: the current schema does not yet fully use canonical metric storage. That migration belongs to Phase 2 and must be handled deliberately.

## Current API routes

### Public routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/` | API status message |
| GET | `/health` | Basic health check |
| POST | `/api/auth/register` | Create a user account |
| POST | `/api/auth/login` | Authenticate and return a JWT |

### Protected routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/users/profile` | Authentication test/profile route |
| GET | `/api/profile` | Get current user profile |
| PUT | `/api/profile` | Update current user profile |
| GET | `/api/measurements` | List current user's measurements |
| POST | `/api/measurements` | Create a measurement |
| GET | `/api/hydration` | List hydration entries |
| POST | `/api/hydration` | Create a hydration entry |
| GET | `/api/hydration/daily-total` | Get daily hydration total |
| DELETE | `/api/hydration/:id` | Delete a hydration entry |
| GET | `/api/dashboard` | Get dashboard summary |

API versioning has not yet been introduced. Phase 1 will move future contracts toward `/api/v1`.

## Environment variables

### Backend

| Variable | Required | Purpose |
|---|---:|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma |
| `JWT_SECRET` | Yes | Secret used to sign and verify JWT access tokens |
| `PORT` | No | API port, default `3000` |
| `NODE_ENV` | No | Runtime environment name |

### Frontend

| Variable | Required | Purpose |
|---|---:|---|
| `VITE_API_URL` | No | Backend base URL, default `http://localhost:3000` |

Never commit real secrets or production credentials.

## Local startup process

### Prerequisites

- Node.js and npm
- PostgreSQL
- Git

### Backend

```bash
cd src/backend
npm install
cp .env.example .env
# Edit DATABASE_URL and JWT_SECRET
npx prisma generate
npx prisma migrate dev
npm run dev
```

The backend should start on `http://localhost:3000` unless `PORT` is changed.

### Frontend

Open a second terminal:

```bash
cd src/frontend
npm install
cp .env.example .env
npm run dev
```

Use the local Vite URL shown in the terminal.

## Validation commands

### Backend

```bash
npm run typecheck
npm test
npm run build
```

### Frontend

```bash
npm run lint
npm run build
```

## Stable release policy

- `main` is the stable release branch.
- Work begins from the latest `main`.
- Each phase or feature uses its own branch.
- Database migrations must be reviewed before merging.
- Tests, type checks, builds, and manual smoke tests must pass before merge.
- Squash merging is preferred for focused feature branches.
