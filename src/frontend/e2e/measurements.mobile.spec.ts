import { test, expect } from "./fixtures";

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

test("mobile Chromium keeps the primary measurement workflow usable", async ({ page }) => {
  await page.goto("/measurements");

  await expect(page.getByRole("heading", { name: "Body Measurements", exact: true })).toBeVisible();
  const startButton = page.getByRole("button", { name: "Guided" });
  await expect(startButton).toBeVisible();
  await startButton.click();

  const dialog = page.getByRole("dialog", { name: "Body measurement session" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Entry mode")).toHaveCount(0);
  await expect(dialog.locator(".measurement-modal-controls")).toHaveCount(0);
  const firstInput = dialog.getByRole("spinbutton", { name: "Neck in" });
  await expect(firstInput).toBeVisible();
  const dialogBox = await dialog.boundingBox();
  const firstInputBox = await firstInput.boundingBox();
  expect(dialogBox).not.toBeNull();
  expect(firstInputBox).not.toBeNull();
  expect(firstInputBox!.y - dialogBox!.y).toBeLessThan(475);
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


test("mobile measurement dialog keeps its header and close control below the member toolbar", async ({ page }) => {
  for (const viewport of [
    { width: 430, height: 740 },
    { width: 430, height: 560 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/measurements");
    await expect(page.getByRole("heading", { name: "Body Measurements", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Guided" }).click();

    const dialog = page.getByRole("dialog", { name: "Body measurement session" });
    const closeButton = dialog.getByRole("button", { name: "Close measurement session" });
    await expectDialogWithinMemberViewport(page, dialog, closeButton);

    await dialog.locator(".measurement-modal-body").evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await closeButton.focus();
    await expect(closeButton).toBeFocused();
    await expectDialogWithinMemberViewport(page, dialog, closeButton);

    const horizontalOverflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(horizontalOverflow).toBe(false);

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  }
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
