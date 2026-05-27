import { chromium } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001";
const viewports = [
  { id: "V1", width: 375, height: 812 },
  { id: "V2", width: 390, height: 844 },
  { id: "V3", width: 768, height: 1024 },
  { id: "V4", width: 1024, height: 768 },
  { id: "V5", width: 1440, height: 900 },
];

const routes = ["/", "/search", "/products/kx-tomato-pack", "/cart", "/checkout", "/seller", "/seller/products", "/admin"];

const browser = await chromium.launch();
const failures = [];

for (const route of routes) {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    const response = await page.goto(`${baseURL}${route}`, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch((error) => ({ error }));
    if (!response || "error" in response || response.status() >= 400) {
      failures.push({ route, viewport: viewport.id, type: "route", detail: "Route did not render successfully" });
      await page.close();
      continue;
    }
    await page.waitForTimeout(1000);

    const health = await page.evaluate(() => {
      const isVisible = (element) => {
        const box = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return box.width > 0 && box.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      };
      const labelFor = (element) => {
        const id = element.getAttribute("id");
        const labelledBy = element.getAttribute("aria-labelledby");
        const explicitLabel = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent?.trim() : "";
        const parentLabel = element.closest("label")?.textContent?.trim();
        const referencedLabel = labelledBy
          ?.split(/\s+/)
          .map((labelId) => document.getElementById(labelId)?.textContent?.trim())
          .filter(Boolean)
          .join(" ");
        return ((element.textContent ?? "").trim() || element.getAttribute("aria-label") || referencedLabel || explicitLabel || parentLabel || element.getAttribute("title") || element.getAttribute("placeholder") || element.tagName).slice(0, 100);
      };
      const interactive = Array.from(document.querySelectorAll("button, a, [role='button'], input, select, textarea")).filter(isVisible);
      const seriousA11y = interactive.filter((element) => {
        return !labelFor(element);
      }).map(labelFor);
      const smallTargets = Array.from(document.querySelectorAll("button, a, [role='button']")).filter((element) => {
        if (!isVisible(element)) return false;
        if (window.innerWidth > 390) return false;
        const box = element.getBoundingClientRect();
        return box.width < 44 || box.height < 44;
      }).map((element) => {
        const box = element.getBoundingClientRect();
        return { label: labelFor(element), width: Math.round(box.width), height: Math.round(box.height) };
      });
      const clipped = interactive.filter((element) => {
        const box = element.getBoundingClientRect();
        return box.right > window.innerWidth + 1 || box.left < -1;
      }).map(labelFor);
      const tableLeaks = Array.from(document.querySelectorAll("table")).filter((table) => {
        const wrapper = table.closest("[class*='overflow-x-auto']");
        return table.scrollWidth > window.innerWidth && !wrapper;
      }).length;
      return {
        scrollWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
        viewportWidth: window.innerWidth,
        imagesWithoutAlt: Array.from(document.images).filter((image) => !image.hasAttribute("alt")).length,
        seriousA11y,
        smallTargets,
        clipped,
        tableLeaks,
      };
    });

    if (health.scrollWidth > health.viewportWidth) failures.push({ route, viewport: viewport.id, type: "overflow", detail: `${health.scrollWidth} > ${health.viewportWidth}` });
    if (health.imagesWithoutAlt) failures.push({ route, viewport: viewport.id, type: "image-alt", detail: health.imagesWithoutAlt });
    if (health.seriousA11y.length) failures.push({ route, viewport: viewport.id, type: "accessible-name", detail: health.seriousA11y });
    if (health.smallTargets.length) failures.push({ route, viewport: viewport.id, type: "tap-target", detail: health.smallTargets });
    if (health.clipped.length) failures.push({ route, viewport: viewport.id, type: "clipped-control", detail: health.clipped });
    if (health.tableLeaks) failures.push({ route, viewport: viewport.id, type: "table-wrapper", detail: health.tableLeaks });
    await page.close();
  }
}

await browser.close();
console.log(JSON.stringify({ baseURL, checked: routes.length * viewports.length, failures }, null, 2));
process.exitCode = failures.length ? 1 : 0;
