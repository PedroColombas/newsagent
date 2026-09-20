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
  await expect(page).toHaveTitle(/^Daily —/);
  await expect(page.getByRole("heading", { name: /fully briefed/i })).toBeVisible();
});

test("the landing page leads into the demo, and the shots all load", async ({ page }) => {
  await page.goto("/landing/");
  await expect(page.getByRole("link", { name: /try the demo/i }).first()).toBeVisible();

  // Every image has to actually load; a broken path is invisible against the pale phone mock.
  const images = page.locator("img");
  const count = await images.count();
  expect(count).toBe(6); // one phone shot per section
  for (let i = 0; i < count; i++) {
    await expect
      .poll(() => images.nth(i).evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
  }

  // "View the code" is deliberately inert until the repo is published (BACKLOG Phase 5). Assert it
  // is either unlinked or pointing somewhere real — a button wired to "#" or "" is the failure mode
  // worth catching, because it looks alive and goes nowhere.
  const code = page.locator("[data-code-link]");
  await expect(code).toBeVisible();
  const href = await code.getAttribute("href");
  if (href !== null) expect(href).toMatch(/^https:\/\/github\.com\//);
});
