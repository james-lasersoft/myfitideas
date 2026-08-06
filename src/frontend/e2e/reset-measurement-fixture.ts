import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const frontendDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const backendDirectory = resolve(frontendDirectory, "../backend");
const npmExecutable = process.env.E2E_NPM_EXECUTABLE ?? "/usr/bin/npm";

export function resetMeasurementFixture(resetAuthSessions = false): void {
  execFileSync(npmExecutable, ["run", "seed:e2e:measurements"], {
    cwd: backendDirectory,
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV ?? "development",
      E2E_RESET_AUTH_SESSIONS: String(resetAuthSessions),
    },
    stdio: "inherit",
  });
}
