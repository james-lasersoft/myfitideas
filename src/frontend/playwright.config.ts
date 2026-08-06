import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:5173";
const apiURL = process.env.E2E_API_URL ?? "http://localhost:3000";
const includeOptionalBrowsers = process.env.PLAYWRIGHT_OPTIONAL_BROWSERS === "true";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "test-results",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL,
    storageState: "e2e/.auth/measurement-user.json",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /.*\.mobile\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-mobile",
      testMatch: /.*\.mobile\.spec\.ts/,
      use: { ...devices["Pixel 5"] },
    },
    ...(includeOptionalBrowsers ? [
      {
        name: "firefox",
        testIgnore: /.*\.mobile\.spec\.ts/,
        use: { ...devices["Desktop Firefox"] },
      },
      {
        name: "webkit",
        testIgnore: /.*\.mobile\.spec\.ts/,
        use: { ...devices["Desktop Safari"] },
      },
    ] : []),
  ],
  webServer: [
    {
      command: "/usr/bin/npm --prefix ../backend run dev",
      url: `${apiURL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "/usr/bin/npm run dev -- --host 127.0.0.1 --port 5173",
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
