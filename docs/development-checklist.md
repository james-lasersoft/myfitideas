# Development and Merge Checklist

Use this checklist before merging any feature or phase into `development` or `main`.

## Before coding

- [ ] Pull the latest target branch.
- [ ] Create a focused feature branch.
- [ ] Confirm the feature's API contract, data model, permissions, entitlement, translation keys, and unit rules.
- [ ] Confirm that no secrets or environment-specific values will be hardcoded.

## During development

- [ ] Keep backend business logic out of React components.
- [ ] Keep API behavior usable by both the web client and a future Android client.
- [ ] Add or update tests with the feature.
- [ ] Add Prisma migrations for schema changes.
- [ ] Review ownership checks for user data.
- [ ] Use ISO-8601 timestamps.
- [ ] Avoid storing uploaded files on local application disk.
- [ ] Update documentation when routes, variables, startup steps, or schema behavior change.

## Database changes

- [ ] Review the generated migration SQL.
- [ ] Verify that existing data will remain valid.
- [ ] Document any assumed source unit or data conversion.
- [ ] Test migration on a non-production database.
- [ ] Confirm rollback or recovery steps for risky migrations.

## Automated validation

### Backend

- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`

### Frontend

- [ ] `npm run lint`
- [ ] `npm run build`

## Manual smoke test

- [ ] Register a user.
- [ ] Log in and log out.
- [ ] Open the dashboard.
- [ ] View and update the profile.
- [ ] Create and view a measurement.
- [ ] Create, view, total, and delete a hydration entry.
- [ ] Confirm one user cannot access another user's data.
- [ ] Confirm protected routes reject missing or invalid tokens.
- [ ] Check browser console and API logs for unexpected errors.

## Code review

- [ ] No passwords, tokens, connection strings, or private keys are committed.
- [ ] Errors do not expose sensitive implementation details.
- [ ] New endpoints validate input and enforce authentication.
- [ ] Database queries are scoped to the authenticated user where required.
- [ ] Naming is consistent and understandable.
- [ ] No unnecessary dependencies were added.
- [ ] Existing behavior remains backward compatible unless the change is documented.

## Merge readiness

- [ ] Branch is current with the target branch.
- [ ] All tests and builds pass.
- [ ] Manual smoke testing passes.
- [ ] Migration and documentation changes are included.
- [ ] Pull request explains the change, testing performed, and known limitations.
- [ ] Merge uses the agreed strategy, preferably squash for focused feature work.
