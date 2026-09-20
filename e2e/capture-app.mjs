// Captures phone-sized screenshots of the running demo for the landing page and README.
// Read-only: it signs in as the demo and navigates, nothing is created or deleted.
//
//   node capture-app.mjs https://newsagent-seven.vercel.app
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const base = process.argv[2];
const outDir = process.argv[3] ?? "../apps/web/public/landing";
if (!base) {
  console.error("usage: node capture-app.mjs <base-url> [outDir]");
  process.exit(1);
}
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

const shot = async (name) => {
  await page.waitForTimeout(700); // let any transition settle before the frame
  await page.screenshot({ path: `${outDir}/${name}.png` });
  console.log("captured", name);
};

await page.goto(base);
await page.getByRole("button", { name: /view the demo/i }).click();

// The demo plays the compiling screen briefly, so wait for the brief itself.
await page.locator('[data-tour="topic"]').first().waitFor({ timeout: 30000 });
await shot("today");

await page.locator('[data-tour="topic"]').first().click();
await page.waitForURL(/\/report\//);
await shot("report");
await page.goBack();

await page.getByRole("link", { name: "History" }).click();
await shot("history");

await page.getByRole("link", { name: "Prefs" }).click();
await shot("preferences");

await page.getByRole("link", { name: "Today" }).click();
await page.locator('[data-tour="podcast"]').waitFor();
await page.locator('[data-tour="podcast"]').click();
await page.getByRole("button", { name: /expand player/i }).click();
await shot("player");

await browser.close();
