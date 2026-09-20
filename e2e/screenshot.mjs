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
const page = await browser.newPage({
  viewport: { width: Number(w), height: Number(h) },
  deviceScaleFactor: 2,
});
await page.goto(url);
await page.screenshot({ path: out });
await browser.close();
console.log("wrote", out);
