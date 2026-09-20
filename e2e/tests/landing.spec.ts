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
  await expect(page).toHaveTitle(/daily brief/i);
  await expect(page.getByRole("heading", { name: /fully briefed/i })).toBeVisible();
});

test("the landing page leads into the demo, and the shots all load", async ({ page }) => {
  await page.goto("/landing/");
  await expect(page.getByRole("link", { name: /try the demo/i }).first()).toBeVisible();

  // Every image has to actually load; a broken path is invisible against the pale phone mock.
  const images = page.locator("img");
  const count = await images.count();
  expect(count).toBe(7); // six phone shots + the architecture diagram
  for (let i = 0; i < count; i++) {
    await expect
      .poll(() => images.nth(i).evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
  }

  // The technical section is the reason this page exists on a CV, so keep it reachable.
  await page.getByRole("link", { name: /how it's built/i }).click();
  await expect(page.getByRole("heading", { name: /four stages/i })).toBeInViewport();
});
