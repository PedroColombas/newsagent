import { test, expect } from "@playwright/test";

// The landing page is the CV link, so it has to survive the app's service worker. The PWA falls
// every navigation back to the app shell by default, which silently turns /landing into the login
// screen — and only in a real browser, since curl has no service worker to be fooled by.
test("the landing page is not swallowed by the app's service worker", async ({ page }) => {
  // Visit the app first, so the service worker registers and takes control.
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker?.ready;
  });

  await page.goto("/landing/");
  await expect(page).toHaveTitle(/personalised news briefing/i);
  await expect(page.getByRole("heading", { name: /the stack, and why/i })).toBeVisible();
});

test("the landing page offers both ways in", async ({ page }) => {
  await page.goto("/landing/");
  await expect(page.getByRole("link", { name: /try the demo/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /view the code/i }).first()).toBeVisible();
});
