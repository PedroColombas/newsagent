// Captures phone-sized screenshots of the running demo, as raw material for the landing page.
// Read-only: it signs in as the demo and navigates. Nothing is created, and the demo does not
// persist preference changes, so clicking through the wizard leaves no trace.
//
//   node capture-app.mjs <base-url> [outDir] [clean]
//
// "clean" hides the demo banner, so the shots show the app as a real user sees it.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const [base, outDir = "../captures", mode] = process.argv.slice(2);
if (!base) {
  console.error("usage: node capture-app.mjs <base-url> [outDir] [clean]");
  process.exit(1);
}
const clean = mode === "clean";
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3, // generous, so the shots survive cropping and decoration
  isMobile: true,
  hasTouch: true,
});

const shot = async (name) => {
  if (clean) {
    await page.addStyleTag({ content: "[data-demo-banner]{display:none !important}" });
  }
  await page.waitForTimeout(700); // let transitions settle before the frame
  await page.screenshot({ path: `${outDir}/${name}.png` });
  console.log("captured", name);
};

await page.goto(base);
await page.getByRole("button", { name: /view the demo/i }).click();
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

// The setup wizard — the part of the product that explains it best, and normally invisible.
await page.getByRole("button", { name: /see how this was set up/i }).click();
await shot("wizard-0-welcome");
await page.getByRole("button", { name: /get started/i }).click();
await shot("wizard-1-areas");
await page.getByRole("button", { name: /^continue$/i }).click();
await shot("wizard-2-topics");
await page.getByRole("button", { name: /^continue$/i }).click();
await shot("wizard-3-your-words");
await page.getByRole("button", { name: /^review$/i }).click();
await shot("wizard-4-review");

// Podcast player, expanded.
await page.getByRole("button", { name: /start reading/i }).click();
await page.locator('[data-tour="podcast"]').waitFor({ timeout: 30000 });
await page.locator('[data-tour="podcast"]').click();
await page.getByRole("button", { name: /expand player/i }).click();
await shot("player");

await browser.close();
