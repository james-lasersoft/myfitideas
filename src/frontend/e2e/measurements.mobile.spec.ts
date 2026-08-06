import { test, expect } from "./fixtures";

test("mobile Chromium keeps the primary measurement workflow usable", async ({ page }) => {
  await page.goto("/measurements");

  await expect(page.getByRole("heading", { name: "Body Measurements", exact: true })).toBeVisible();
  const startButton = page.getByRole("button", { name: "Start measurement session" });
  await expect(startButton).toBeVisible();
  await startButton.click();

  const dialog = page.getByRole("dialog", { name: "Body measurement session" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Novice" })).toBeVisible();
  await expect(dialog.getByRole("spinbutton", { name: "Neck in" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Next" })).toBeVisible();
  await expect(page.getByText("Record daily weight separately from guided body-measurement sessions.")).toHaveCount(0);

  const keyboardHelp = dialog.locator("details").filter({ hasText: "Keyboard help" });
  await keyboardHelp.getByText("Keyboard help").press("Enter");
  await expect(keyboardHelp).toHaveAttribute("open", "");
  await expect(dialog.getByText("Press Enter to continue. For paired measurements, Enter moves from left to right.")).toHaveCount(1);

  const techniqueHelp = dialog.locator("details").filter({ hasText: "Technique" });
  await techniqueHelp.getByText("Technique").press("Enter");
  await expect(techniqueHelp).toHaveAttribute("open", "");
  await expect(techniqueHelp.getByText("Place the tape below the larynx, level and snug without compressing the skin.")).toBeVisible();

  await page.getByRole("spinbutton", { name: "Neck in" }).fill("15");
  await page.getByRole("spinbutton", { name: "Neck in" }).press("Enter");
  await expect(dialog.getByRole("heading", { name: "Chest" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Skip" })).toBeVisible();

  const horizontalOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(horizontalOverflow).toBe(false);
});


test("mobile Chromium keeps body transformation intelligence readable", async ({ page }) => {
  await page.goto("/measurements");
  await expect(page.getByRole("heading", { name: "Body transformation intelligence" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Insight period" })).toBeVisible();
  const table = page.getByRole("table", { name: /Backend-calculated body transformation changes/ });
  await expect(table.getByRole("row", { name: /Weight/ })).toBeVisible();
  await expect(table.getByRole("row", { name: /Upper arms Left:/ })).toBeVisible();

  const horizontalOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(horizontalOverflow).toBe(false);
});
