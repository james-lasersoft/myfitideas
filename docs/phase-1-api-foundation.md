# Phase 1: Backend and API Foundation

## Purpose

Phase 1 establishes a stable, platform-neutral API contract for the React web client and the planned Android client. It does not remove or rewrite the existing application routes.

## Added in this phase

- Versioned API prefix: `/api/v1`
- Existing feature routers exposed under `/api/v1`
- Legacy `/api/*` routes retained for current web-client compatibility
- OpenAPI 3.1 document at `/api/docs/openapi.json`
- Request IDs returned in the `x-request-id` response header
- ISO-8601 timestamps in health and standardized metadata
- Standardized error response structure
- Reusable success and pagination response helpers
- JSON request body limit of 1 MB
- Disabled Express `x-powered-by` header
- Central 404 and error middleware

## Version 1 routes

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/users/profile`
- `GET /api/v1/profile`
- `PUT /api/v1/profile`
- `GET /api/v1/measurements`
- `POST /api/v1/measurements`
- `GET /api/v1/hydration`
- `POST /api/v1/hydration`
- `GET /api/v1/hydration/daily-total`
- `DELETE /api/v1/hydration/:id`
- `GET /api/v1/dashboard`

## Standard error shape

```json
{
  "success": false,
  "error": {
    "code": "ROUTE_NOT_FOUND",
    "message": "Route GET /missing was not found"
  },
  "meta": {
    "requestId": "uuid",
    "timestamp": "2026-07-30T00:00:00.000Z"
  }
}
```

## Compatibility policy

The existing `/api/*` endpoints remain active in this phase. New client development should use `/api/v1`. Existing frontend calls can be migrated incrementally and tested before the legacy endpoints are removed in a later release.

## Local validation

From `src/backend` run:

```bash
npm install
npm run typecheck
npm test
npm run build
npm run dev
```

Then verify:

- `GET /health`
- `GET /api/docs/openapi.json`
- one existing legacy endpoint
- the equivalent `/api/v1` endpoint
- an unknown route returns the standardized 404 response
