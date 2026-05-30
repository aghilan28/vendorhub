// M0 runtime evidence: screenshots + HTTP status + console status per surface.
// Read-only. Usage: node scripts/m0-runtime-evidence.mjs
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const OUT = "docs/integration/screenshots";
mkdirSync(OUT, { recursive: true });

// [name, path, expectExist] — surfaces the directive asks to verify, including ones expected MISSING.
const targets = [
  ["marketplace-home", "/", true],
  ["commerce-intelligence-center", "/commerce-intelligence", true],
  ["pricing-studio", "/pricing", true],
  ["forecast-studio", "/forecasting", true],
  ["inventory-intelligence", "/inventory-intelligence", true],
  ["supply-intelligence", "/supply-intelligence", true],
  ["routing-intelligence", "/routing", true],
  ["telemetry-intelligence", "/telemetry", true],
  ["search-intelligence", "/search-intelligence", true],
  ["recommendations", "/recommendations", true],
  // Directive-named surfaces expected to be MISSING (verify the claim, do not assume):
  ["research-center", "/research", false],
  ["knowledge-os", "/knowledge", false],
  ["knowledge-graph", "/knowledge-graph", false],
  ["governance-center", "/governance", false],
  ["simulation-studio", "/simulation", false],
  ["secis-studio", "/secis", false],
  ["meta-knowledge-center", "/meta-knowledge", false],
];

const results = [];
const browser = await chromium.launch();

for (const [name, path, expectExist] of targets) {
  const consoleErrors = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 160)); });
  let status = "ERR";
  try {
    const resp = await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 20000 });
    status = resp ? resp.status() : "?";
    await page.waitForTimeout(400);
    if (expectExist) {
      await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
    }
  } catch (err) {
    status = "ERROR:" + String(err).slice(0, 80);
  }
  results.push({ name, path, status, expectExist, consoleErrors: consoleErrors.length, sampleError: consoleErrors[0] || null });
  console.log(`${String(status).padEnd(6)} ${path.padEnd(24)} consoleErrors=${consoleErrors.length}`);
  await page.close();
}

await browser.close();
writeFileSync(`${OUT}/_runtime-evidence.json`, JSON.stringify(results, null, 2));
console.log("\nWROTE docs/integration/screenshots/_runtime-evidence.json");
