# Phase 5 Deployment Checklist

Closeout date: August 3, 2026

## Completed validation

- [x] Phase 5 branch checked out
- [x] `npm ci` completed in backend and frontend
- [x] `npx prisma generate` completed
- [x] Backend `npm run typecheck` passed
- [x] Backend `npm run build` passed
- [x] Backend `npm test` passed: 4 suites, 21 tests
- [x] Frontend `npm run validate` passed
- [x] Frontend localization guard passed: 41 files, 481 catalog entries
- [x] Frontend production build passed
- [x] Login and session revocation tested
- [x] User invitation and acceptance tested
- [x] Role assignment tested
- [x] Unauthorized route handling tested
- [x] Audit events verified
- [x] Final active Super Administrator protections tested
- [x] Manual RBAC acceptance testing approved

## Required before deployment to a new environment

- [ ] Database backup completed
- [ ] `npx prisma migrate deploy` completed against the target database
- [ ] `npm run seed:rbac` completed against the target database
- [ ] `npm run seed:translations` completed against the target database
- [ ] Existing user confirmed as Super Administrator in the target environment
- [ ] Target-environment smoke test completed

## Dependency security note

The remaining React Router audit advisory affects unstable React Server Components APIs that are not used by the current Vite SPA. No forced downgrade was applied. Reassess during the next controlled dependency-security maintenance cycle.
