import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { FullConfig } from "@playwright/test";
import { resetMeasurementFixture } from "./reset-measurement-fixture";

const storageStatePath = resolve("e2e/.auth/measurement-user.json");

export default async function globalSetup(config: FullConfig): Promise<void> {
  resetMeasurementFixture(true);

  const baseURL = config.projects[0]?.use.baseURL ?? "http://localhost:5173";
  const apiURL = process.env.E2E_API_URL ?? "http://localhost:3000";
  const email = process.env.E2E_USER_EMAIL ?? "phase7.measurements.e2e@example.test";
  const password = process.env.E2E_USER_PASSWORD ?? "MyFitIdeas-E2E-2026!";

  const response = await fetch(`${apiURL}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error(`E2E login failed with HTTP ${response.status}: ${await response.text()}`);
  }

  const payload = await response.json() as {
    token: string;
    refreshToken?: string;
    user: unknown;
  };
  const origin = new URL(baseURL).origin;
  const localStorage = [
    { name: "authToken", value: payload.token },
    { name: "currentUser", value: JSON.stringify(payload.user) },
    { name: "myfitideas.locale", value: "en-US" },
  ];
  if (payload.refreshToken) {
    localStorage.push({ name: "refreshToken", value: payload.refreshToken });
  }

  await mkdir(dirname(storageStatePath), { recursive: true });
  await writeFile(storageStatePath, JSON.stringify({
    cookies: [],
    origins: [{ origin, localStorage }],
  }, null, 2));
}
