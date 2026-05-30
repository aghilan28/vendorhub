// M0 integrated-platform screenshot capture for runtime certification.
// Read-only: drives the running server and writes PNGs. Usage: node scripts/m0-screenshots.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const OUT = "docs/integration/screenshots";
mkdirSync(OUT, { recursive: true });

const targets = [
  ["marketplace-home", "/"],
  ["commerce-intelligence-center", "/commerce-intelligence"],
  ["pricing-studio", "/pricing"],
  ["pricing-simulator", "/pricing/simulator"],
  ["pricing-recommendations", "/pricing/recommendations"],
  ["forecast-studio", "/forecasting"],
  ["forecast-scenarios", "/forecasting/scenarios"],
  ["forecast-comparison", "/forecasting/comparison"],
  ["inventory-intelligence", "/inventory-intelligence"],
  ["supply-intelligence", "/supply-intelligence"],
  ["routing-intelligence", "/routing"],
  ["telemetry-intelligence", "/telemetry"],
  ["search-intelligence", "/search-intelligence"],
  ["recommendations", "/recommendations"],
];

const results = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

for (const [name, path] of targets) {
  try {
    const resp = await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(500);
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
console.log("\nM0_CAPTURE_SUMMARY " + JSON.stringify(results));
