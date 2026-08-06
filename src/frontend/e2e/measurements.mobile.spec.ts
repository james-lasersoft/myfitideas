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

  await page.getByRole("spinbutton", { name: "Neck in" }).fill("15");
  await page.getByRole("spinbutton", { name: "Neck in" }).press("Enter");
  await expect(dialog.getByRole("heading", { name: "Chest" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Skip" })).toBeVisible();

  const horizontalOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(horizontalOverflow).toBe(false);
});
