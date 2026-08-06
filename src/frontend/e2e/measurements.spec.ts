import { test, expect } from "./fixtures";

const BASELINE_ID = "10e2e000-0000-4000-8000-000000000001";
const COMPARISON_ID = "10e2e000-0000-4000-8000-000000000002";
const RAW_TRANSLATION_KEY = /\b(?:measurements|common|dashboard)\.[a-z0-9_.]+\b/;

async function openMeasurements(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/measurements");
  await expect(page.getByRole("heading", { name: "Body Measurements", exact: true })).toBeVisible();
  await expect(page.getByRole("table", { name: /Body measurement sessions/ })).toBeVisible();
}

async function continueWithValue(
  page: import("@playwright/test").Page,
  label: string,
  value: string,
): Promise<void> {
  const input = page.getByRole("spinbutton", { name: label });
  await input.fill(value);
  await input.press("Enter");
}

async function expectDialogWithinMemberViewport(
  page: import("@playwright/test").Page,
  dialog: import("@playwright/test").Locator,
  closeButton: import("@playwright/test").Locator,
): Promise<void> {
  const toolbarBox = await page.locator(".member-global-controls").boundingBox();
  const dialogBox = await dialog.boundingBox();
  const closeBox = await closeButton.boundingBox();
  const viewport = page.viewportSize();

  expect(toolbarBox).not.toBeNull();
  expect(dialogBox).not.toBeNull();
  expect(closeBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(dialogBox!.y).toBeGreaterThanOrEqual(toolbarBox!.y + toolbarBox!.height - 1);
  expect(closeBox!.y).toBeGreaterThanOrEqual(toolbarBox!.y + toolbarBox!.height - 1);
  expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(viewport!.height + 1);
  expect(closeBox!.y + closeBox!.height).toBeLessThanOrEqual(viewport!.height + 1);
}

test("measurement history loads without raw translation keys", async ({ page }) => {
  await openMeasurements(page);

  const history = page.getByRole("table", { name: /Body measurement sessions/ });
  await expect(history.locator("tbody tr")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Compare sessions" })).toBeEnabled();
  await expect(page.locator("body")).not.toContainText(RAW_TRANSLATION_KEY);
});

test("novice keyboard workflow reviews, edits, and saves only deliberately", async ({ page }) => {
  await openMeasurements(page);
  const historyRows = page.getByRole("table", { name: /Body measurement sessions/ }).locator("tbody tr");
  await expect(historyRows).toHaveCount(2);

  const startButton = page.getByRole("button", { name: "Start measurement session" });
  await startButton.click();
  const dialog = page.getByRole("dialog", { name: "Body measurement session" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Novice" })).toHaveAttribute("aria-pressed", "true");

  await continueWithValue(page, "Neck in", "15");
  await expect(dialog.getByRole("heading", { name: "Chest" })).toBeVisible();
  await dialog.getByRole("button", { name: "Skip" }).click();
  await continueWithValue(page, "Waist in", "32");
  await continueWithValue(page, "Abdomen in", "34");
  await continueWithValue(page, "Hips in", "38");

  await page.getByRole("spinbutton", { name: "Left upper arm in" }).fill("12");
  await page.getByRole("spinbutton", { name: "Left upper arm in" }).press("Enter");
  await expect(page.getByRole("spinbutton", { name: "Right upper arm in" })).toBeFocused();
  await continueWithValue(page, "Right upper arm in", "12.5");

  await dialog.getByRole("button", { name: "Skip" }).click();
  await page.getByRole("spinbutton", { name: "Left thigh in" }).fill("22");
  await page.getByRole("spinbutton", { name: "Left thigh in" }).press("Enter");
  await continueWithValue(page, "Right thigh in", "22.5");
  await dialog.getByRole("button", { name: "Skip" }).click();

  await expect(dialog.getByRole("heading", { name: "Review your measurements" })).toBeVisible();
  const review = dialog.getByRole("table", { name: /Entered and skipped measurements/ });
  await expect(review.getByRole("rowheader")).toHaveText([
    "Neck", "Chest", "Waist", "Abdomen", "Hips",
    "Upper arms", "Forearms", "Thighs", "Calves",
  ]);
  await expect(review.getByText("15 in")).toBeVisible();
  await expect(review.getByText("32 in")).toBeVisible();
  await expect(review.getByText(/Left 12 in .* Right 12.5 in/)).toBeVisible();
  await expect(review.getByText(/Left 22 in .* Right 22.5 in/)).toBeVisible();
  await expect(review.getByRole("row", { name: "Edit Forearms" })).toContainText("Skipped");
  await expect(review.getByRole("row", { name: "Edit Calves" })).toContainText("Skipped");

  await expect(historyRows).toHaveCount(2);
  await expect(page.getByText("Body measurement session saved successfully.")).toHaveCount(0);

  const waistReviewRow = review.getByRole("row", { name: "Edit Waist" });
  await waistReviewRow.focus();
  await waistReviewRow.press("Enter");
  await expect(dialog.getByRole("heading", { name: "Waist" })).toBeVisible();

  for (const heading of ["Abdomen", "Hips", "Upper arms", "Forearms", "Thighs", "Calves"]) {
    await dialog.getByRole("button", { name: "Next" }).click();
    await expect(dialog.getByRole("heading", { name: heading })).toBeVisible();
  }
  await dialog.getByRole("button", { name: "Next" }).click();
  await expect(dialog.getByRole("heading", { name: "Review your measurements" })).toBeVisible();
  await expect(historyRows).toHaveCount(2);

  const saveResponse = page.waitForResponse((response) =>
    response.url().endsWith("/api/measurements") &&
    response.request().method() === "POST" &&
    response.status() === 201
  );
  await expect(dialog.getByRole("button", { name: "Save session" })).toHaveCount(1);
  await dialog.getByRole("button", { name: "Save session" }).click();
  await saveResponse;

  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("Body measurement session saved successfully.")).toBeVisible();
  await expect(historyRows).toHaveCount(3);
});

test("historical details are read-only, show missing and calculated values, and restore focus", async ({ page }) => {
  await openMeasurements(page);
  const row = page.getByRole("row", { name: /Open session details/ }).first();
  await row.focus();
  await row.press("Space");

  const dialog = page.getByRole("dialog", { name: "Measurement session details" });
  await expect(dialog.getByRole("heading", { name: "Measurement session details" })).toBeFocused();
  await expectDialogWithinMemberViewport(
    page,
    dialog,
    dialog.getByRole("button", { name: "Close", exact: true }),
  );
  const details = dialog.getByRole("table", { name: /All recorded and unrecorded/ });
  await expect(details.getByRole("rowheader")).toHaveText([
    "Neck", "Chest", "Waist", "Abdomen", "Hips",
    "Upper arms", "Forearms", "Thighs", "Calves",
  ]);
  await expect(details.getByRole("row", { name: /Neck 15.5 in/ })).toBeVisible();
  await expect(details.getByRole("row", { name: /Abdomen Not recorded/ })).toBeVisible();
  await expect(details.getByRole("row", { name: /Upper arms Left: 12.5 in Right: 13.0 in/ })).toBeVisible();
  await expect(dialog.getByText("18.0 %")).toBeVisible();
  await expect(dialog.getByText(/Calculation method: U.S. Navy circumference estimate/)).toBeVisible();
  await expect(dialog.getByText("0.479")).toBeVisible();
  await expect(dialog.getByText(/Calculation method: Waist divided by height/)).toBeVisible();
  await expect(dialog.getByText("30.9 lb")).toBeVisible();
  await expect(dialog.getByText("141.1 lb")).toBeVisible();
  await expect(dialog.getByRole("textbox")).toHaveCount(0);
  await expect(dialog.getByRole("spinbutton")).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: /Edit|Delete/ })).toHaveCount(0);

  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(row).toBeFocused();

  await row.press("Enter");
  await expect(page.getByRole("dialog", { name: "Measurement session details" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Measurement session details" })).toHaveCount(0);
  await expect(row).toBeFocused();
});

test("comparison uses backend results, prevents duplicate selections, and restores focus", async ({ page }) => {
  await openMeasurements(page);
  const trigger = page.getByRole("button", { name: "Compare sessions" });
  const responsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/measurements/compare") && response.status() === 200
  );
  await trigger.click();
  await responsePromise;

  const dialog = page.getByRole("dialog", { name: "Compare measurement sessions" });
  await expectDialogWithinMemberViewport(
    page,
    dialog,
    dialog.getByRole("button", { name: "Close", exact: true }),
  );
  const baseline = dialog.getByRole("combobox", { name: "Baseline session" });
  const comparison = dialog.getByRole("combobox", { name: "Comparison session" });
  await expect(baseline).toHaveValue(BASELINE_ID);
  await expect(comparison).toHaveValue(COMPARISON_ID);
  await expect(comparison.locator(`option[value="${BASELINE_ID}"]`)).toHaveAttribute("disabled", "");
  await expect(baseline.locator(`option[value="${COMPARISON_ID}"]`)).toHaveAttribute("disabled", "");

  const table = dialog.getByRole("table", { name: /Body measurement changes/ });
  await expect(table.getByRole("row", { name: /Neck 38.1 cm 39.37 cm \+1.27 cm \+3.33 %/ })).toBeVisible();
  await expect(table.getByRole("row", { name: /Abdomen 88.9 cm Not recorded Comparison not recorded/ })).toBeVisible();
  await expect(table.getByRole("row", { name: /Upper arms Left: 30.48 cm Right: 31.75 cm/ })).toBeVisible();
  await expect(table.getByRole("row", { name: /Body fat 20 % U.S. Navy circumference estimate 18 %/ })).toBeVisible();
  await expect(table.getByRole("row", { name: /Waist-to-height 0.4935 Waist divided by height 0.479/ })).toBeVisible();
  await expect(table.getByRole("row", { name: /Fat mass 15 kg .* 14 kg .* -1 kg -6.67 %/ })).toBeVisible();
  await expect(table.getByRole("row", { name: /Lean mass 60 kg .* 64 kg .* \+4 kg \+6.67 %/ })).toBeVisible();

  await expect(dialog.getByRole("heading", { name: "Compare measurement sessions" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.getByRole("dialog", { name: "Compare measurement sessions" }).getByRole("button", { name: "Close", exact: true }).click();
  await expect(trigger).toBeFocused();
});

test("entry dialog stays below the member toolbar across desktop and tablet viewports", async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
    { width: 768, height: 700 },
  ]) {
    await page.setViewportSize(viewport);
    await openMeasurements(page);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const toolbarBox = await page.locator(".member-global-controls").boundingBox();
    const pageHeaderBox = await page.locator(".measurements-header").boundingBox();
    expect(toolbarBox).not.toBeNull();
    expect(pageHeaderBox).not.toBeNull();
    expect(pageHeaderBox!.y).toBeGreaterThanOrEqual(toolbarBox!.y + toolbarBox!.height - 1);

    await page.getByRole("button", { name: "Start measurement session" }).click();
    const dialog = page.getByRole("dialog", { name: "Body measurement session" });
    const closeButton = dialog.getByRole("button", { name: "Close measurement session" });
    await expectDialogWithinMemberViewport(page, dialog, closeButton);

    await dialog.locator(".measurement-modal-body").evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await closeButton.focus();
    await expect(closeButton).toBeFocused();
    await expectDialogWithinMemberViewport(page, dialog, closeButton);

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  }
});

test("entry dialog traps focus and Escape restores the opener", async ({ page }) => {
  await openMeasurements(page);
  const trigger = page.getByRole("button", { name: "Start measurement session" });
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: "Body measurement session" });
  await expect(dialog.getByRole("spinbutton", { name: "Neck in" })).toBeFocused();
  const closeButton = dialog.getByRole("button", { name: "Close measurement session" });
  const nextButton = dialog.getByRole("button", { name: "Next" });
  await closeButton.focus();
  await page.keyboard.press("Shift+Tab");
  await expect(nextButton).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(closeButton).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("English and Brazilian Portuguese measurement views contain localized UI", async ({ page }) => {
  await openMeasurements(page);
  await expect(page.locator("body")).not.toContainText(RAW_TRANSLATION_KEY);

  await page.getByRole("button", { name: /Brasil/ }).click();
  await expect(page.getByRole("heading", { name: "Medidas Corporais", exact: true })).toBeVisible();
  await expect(page.getByText("Registre peso e medidas corporais.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Iniciar.*medidas/ })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(RAW_TRANSLATION_KEY);
});


test("body transformation intelligence uses backend analytics across periods", async ({ page }) => {
  await openMeasurements(page);
  const analyticsResponse = page.waitForResponse((response) =>
    response.url().includes("/api/v1/analytics/body-transformation") && response.status() === 200
  );
  const period = page.getByRole("combobox", { name: "Insight period" });
  await expect(period).toHaveValue("LAST_30_DAYS");
  await expect(page.getByRole("heading", { name: "Body transformation intelligence" })).toBeVisible();

  const table = page.getByRole("table", { name: /Backend-calculated body transformation changes/ });
  await expect(table.getByRole("rowheader")).toHaveText([
    "Weight", "Neck", "Chest", "Waist", "Hips", "Upper arms", "Thighs", "Calves",
    "BMI", "Body fat", "Waist-to-height", "Fat mass", "Lean mass",
  ]);
  await expect(table.getByRole("row", { name: /Upper arms Left:/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recording consistency" })).toBeVisible();

  await period.selectOption("LAST_7_DAYS");
  await analyticsResponse;
  await expect(period).toHaveValue("LAST_7_DAYS");
});
