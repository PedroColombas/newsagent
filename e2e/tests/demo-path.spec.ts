import { test, expect, type Page } from "@playwright/test";

// Signs in exactly as a visitor does — by pressing the demo button. No credentials live in this
// test, because the app already carries them for precisely this purpose.
async function enterDemo(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: /view the demo/i }).click();
  // The banner is the first thing that proves we are inside the demo account.
  await expect(page.getByText(/sample briefs/i)).toBeVisible();
}

test.describe("the path a visitor walks", () => {
  test.beforeEach(async ({ page }) => {
    await enterDemo(page);
  });

  test("lands on a brief", async ({ page }) => {
    // The demo plays the real compiling screen for a moment first, hence the patience here.
    await expect(page.locator('[data-tour="topic"]')).toBeVisible();
    await expect(page.getByText(/min read/i)).toBeVisible();
  });

  test("opens a brief to read and returns", async ({ page }) => {
    await page.locator('[data-tour="topic"]').click();
    await expect(page).toHaveURL(/\/report\//);
    await page.goBack();
    await expect(page.locator('[data-tour="topic"]')).toBeVisible();
  });

  test("history shows the saved briefs", async ({ page }) => {
    await expect(page.locator('[data-tour="topic"]')).toBeVisible();
    await page.getByRole("link", { name: "History" }).click();
    await expect(page.locator('[data-tour="history-calendar"]')).toBeVisible();
    await expect(page.locator('[data-tour="history-row"]').first()).toBeVisible();
  });

  test("preferences are editable", async ({ page }) => {
    await expect(page.locator('[data-tour="topic"]')).toBeVisible();
    await page.getByRole("link", { name: "Prefs" }).click();
    await expect(page.locator('[data-tour="prefs-topics"]')).toBeVisible();

    // Open a topic for editing and back out again. Proves the screen is genuinely interactive
    // without leaving the demo in a different state than it started.
    //
    // NOT the "add topic" button: the demo sits at the four-topic cap, so that one is disabled.
    await page.locator('[data-tour="prefs-topics"] button').first().click();
    await expect(page.getByText(/edit topic/i)).toBeVisible();
    await page.getByRole("button", { name: /^cancel$/i }).click();
    await expect(page.getByText(/edit topic/i)).toBeHidden();
  });

  test("nothing a visitor changes is saved", async ({ page }) => {
    await expect(page.locator('[data-tour="topic"]')).toBeVisible();
    await page.getByRole("link", { name: "Prefs" }).click();
    await expect(page.getByText(/4 of 4 topics/i)).toBeVisible();

    // The screen must respond exactly as the real product does...
    await page.getByRole("button", { name: /^delete /i }).first().click();
    await expect(page.getByText(/3 of 4 topics/i)).toBeVisible();

    // ...but nothing may be written. The pause outlasts the save debounce, so a real write would
    // have happened by now; the reload then proves it did not.
    await page.waitForTimeout(2000);
    await page.reload();
    await expect(page.getByText(/4 of 4 topics/i)).toBeVisible();
  });

  test("the setup wizard can be replayed", async ({ page }) => {
    await expect(page.locator('[data-tour="topic"]')).toBeVisible();
    await page.getByRole("link", { name: "Prefs" }).click();
    await page.getByRole("button", { name: /see how this was set up/i }).click();

    // A replay starts where a first run starts, on the welcome screen, and only then the wizard.
    await page.getByRole("button", { name: /get started/i }).click();
    await expect(page.getByText(/step 1 of/i)).toBeVisible();
  });

  test("the podcast player docks and expands", async ({ page }) => {
    await expect(page.locator('[data-tour="podcast"]')).toBeVisible();
    await page.locator('[data-tour="podcast"]').click();

    // Docked: the mini player sits above the nav and follows you between tabs. Whether the audio
    // actually decodes is not asserted — that would be flaky in CI and is not what this covers.
    const expand = page.getByRole("button", { name: /expand player/i });
    await expect(expand).toBeVisible();

    await expand.click();
    await expect(page.getByText(/your daily report/i).first()).toBeVisible();
  });
});
