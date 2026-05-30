// Baseline screenshot capture for the KARTEX Visual Product Catalog.
// Read-only: drives the running production server and writes PNGs.
// Usage: node scripts/baseline-screenshots.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const OUT = "docs/baseline/screenshots";
mkdirSync(OUT, { recursive: true });

// Only surfaces that exist on the certified branch and do not hard-require Supabase env.
const targets = [
  ["marketplace-home", "/"],
  ["home", "/home"],
  ["categories", "/categories"],
  ["cart", "/cart"],
  ["checkout", "/checkout"],
  ["search", "/search"],
  ["wishlist", "/wishlist"],
  ["sign-in", "/sign-in"],
  ["sign-up", "/sign-up"],
  ["seller-registration", "/seller-registration"],
  ["launch", "/launch"],
  ["demo", "/demo"],
  ["offline", "/offline"],
];

const results = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

for (const [name, path] of targets) {
  const url = BASE + path;
  try {
    const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(600);
    const file = `${OUT}/${name}.png`;
    await page.screenshot({ path: file, fullPage: true });
    results.push({ name, path, status: resp ? resp.status() : "?", file });
    console.log(`OK   ${path} -> ${file} (HTTP ${resp ? resp.status() : "?"})`);
  } catch (err) {
    results.push({ name, path, status: "ERROR", error: String(err).slice(0, 120) });
    console.log(`FAIL ${path} -> ${String(err).slice(0, 120)}`);
  }
}

await browser.close();
console.log("\nCAPTURE_SUMMARY " + JSON.stringify(results));
