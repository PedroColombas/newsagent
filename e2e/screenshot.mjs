// Capture helper for the landing page and README assets - the architecture diagram, and screens of
// the running app. Lives here because this is where Playwright is installed; it is not a test.
//
//   node screenshot.mjs <url> <output.png> [width] [height]
//
// e.g.  node screenshot.mjs file:///.../docs/architecture.svg ../docs/architecture.png 1040 600
//       node screenshot.mjs https://newsagent-seven.vercel.app ../docs/shot-today.png 390 844
import { chromium } from "@playwright/test";

const [url, out, w = "390", h = "844"] = process.argv.slice(2);
if (!url || !out) {
  console.error("usage: node screenshot.mjs <url> <output.png> [width] [height]");
  process.exit(1);
}

const browser = await chromium.launch();
// deviceScaleFactor 2 so the result stays sharp on a retina screen.
// height "full" captures the whole page at 1x, which is what you want for reviewing a long page.
const full = h === "full";
const page = await browser.newPage({
  viewport: { width: Number(w), height: full ? 900 : Number(h) },
  deviceScaleFactor: full ? 1 : 2,
});
await page.goto(url);
await page.waitForTimeout(800); // let webfonts settle
await page.screenshot({ path: out, fullPage: full });
await browser.close();
console.log("wrote", out);
