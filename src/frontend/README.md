# MyFitIdeas frontend

The frontend is a React and TypeScript application built with Vite.

## Local validation

From `src/frontend`:

```bash
/usr/bin/npm ci
/usr/bin/npm test
/usr/bin/npm run lint
/usr/bin/npm run build
```

Vitest and React Testing Library cover isolated components and mocked service boundaries. Playwright covers browser behavior against the real frontend, backend, authentication flow, and database.

## Playwright end-to-end tests

The Phase 7 measurement suite uses a deterministic user in the reserved `.test` domain. Its reset script refuses to run with `NODE_ENV=production` and deletes only that user's measurement fixture data.

Prerequisites:

1. Install and migrate the backend database.
2. Seed the backend RBAC and translation prerequisites when setting up a new database:

   ```bash
   cd ../backend
   /usr/bin/npm run seed:rbac
   /usr/bin/npm run seed:translations
   ```

3. Install the Chromium browser binary from `src/frontend`:

   ```bash
   /usr/bin/npm exec playwright install chromium
   ```

   On a new Ubuntu or WSL image, install the required operating-system packages once with `playwright install-deps chromium` using the environment's normal privilege workflow.

Run the baseline desktop and mobile Chromium projects:

```bash
/usr/bin/npm run test:e2e
```

Useful interactive commands:

```bash
/usr/bin/npm run test:e2e:headed
/usr/bin/npm run test:e2e:ui
/usr/bin/npm run test:e2e:report
```

Playwright reuses frontend and backend services already listening on ports 5173 and 3000 during local development. If they are not running, the configuration starts them for the test run. CI always starts deterministic services through the configured commands. The test reset is safe to repeat and runs before each test, so tests do not depend on execution order.

Optional environment variables:

- `E2E_BASE_URL` - frontend origin; defaults to `http://localhost:5173`.
- `E2E_API_URL` - backend origin; defaults to `http://localhost:3000`.
- `E2E_USER_EMAIL` - fixture login; must end in `.test`.
- `E2E_USER_PASSWORD` - fixture password.
- `E2E_NPM_EXECUTABLE` - npm binary used by the reset helper; defaults to `/usr/bin/npm`.
- `PLAYWRIGHT_OPTIONAL_BROWSERS=true` - adds Firefox and WebKit desktop projects after installing their browser binaries.

Failure screenshots, retained videos, and retry traces are written to `test-results/`. The HTML report is written to `playwright-report/`. These generated artifacts and the authenticated storage state are ignored by Git.
