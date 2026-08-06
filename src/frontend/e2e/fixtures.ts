import { test as base, expect } from "@playwright/test";
import { resetMeasurementFixture } from "./reset-measurement-fixture";

export const test = base.extend({
  page: async ({ page }, run) => {
    resetMeasurementFixture();
    await run(page);
  },
});

export { expect };
