import { expect, test } from "@playwright/test";

const viewports = [
  { id: "V1", width: 375, height: 812 },
  { id: "V2", width: 390, height: 844 },
  { id: "V3", width: 768, height: 1024 },
  { id: "V4", width: 1024, height: 768 },
  { id: "V5", width: 1440, height: 900 },
] as const;

const criticalRoutes = ["/", "/search", "/products/kx-tomato-pack", "/cart", "/checkout", "/seller", "/seller/products", "/admin"] as const;

async function uiHealth(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const visible = (element: Element) => {
      const box = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return box.width > 0 && box.height > 0 && style.display !== "none" && style.visibility !== "hidden" && element.getAttribute("aria-hidden") !== "true";
    };

    const accessibleName = (element: Element) => {
      const id = element.getAttribute("id");
      const labelledBy = element.getAttribute("aria-labelledby");
      const explicitLabel = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent?.trim() : "";
      const parentLabel = element.closest("label")?.textContent?.trim();
      const referencedLabel = labelledBy
        ?.split(/\s+/)
        .map((labelId) => document.getElementById(labelId)?.textContent?.trim())
        .filter(Boolean)
        .join(" ");
      return (
        (element.textContent ?? "").trim() ||
        element.getAttribute("aria-label") ||
        referencedLabel ||
        explicitLabel ||
        parentLabel ||
        element.getAttribute("title") ||
        element.getAttribute("placeholder") ||
        element.getAttribute("alt") ||
        ""
      );
    };

    const unnamedInteractive = Array.from(document.querySelectorAll("button, a, [role='button'], input, select, textarea")).filter((element) => {
      if (!visible(element)) return false;
      return !accessibleName(element);
    });

    const smallTargets = Array.from(document.querySelectorAll("button, a")).filter((element) => {
      if (!visible(element) || window.innerWidth > 390) return false;
      const box = element.getBoundingClientRect();
      return box.width < 44 || box.height < 44;
    });

    const tableLeaks = Array.from(document.querySelectorAll("table")).filter((table) => {
      if (!visible(table)) return false;
      return table.scrollWidth > window.innerWidth && !table.closest(".responsive-table-shell, [class*='overflow-x-auto']");
    });

    const offscreenControls = Array.from(document.querySelectorAll("button, a")).filter((element) => {
      if (!visible(element)) return false;
      const box = element.getBoundingClientRect();
      return box.left < -1 || box.right > window.innerWidth + 1;
    });

    const focusableControls = Array.from(document.querySelectorAll("button, a, input, select, textarea")).filter(visible);
    const missingFocusStyles = focusableControls.filter((element) => {
      const classes = element.getAttribute("class") ?? "";
      return !classes.includes("focus-ring") && !classes.includes("focus-visible") && !classes.includes("skip-link") && !element.closest(".focus-ring, [class*='focus-within']");
    });

    return {
      scrollWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
      viewportWidth: window.innerWidth,
      unnamedInteractive: unnamedInteractive.length,
      imagesWithoutAlt: Array.from(document.images).filter((image) => !image.hasAttribute("alt")).length,
      smallTargets: smallTargets.map((element) => ({
        text: ((element.textContent ?? "").trim() || element.getAttribute("aria-label") || element.tagName).slice(0, 80),
        width: Math.round(element.getBoundingClientRect().width),
        height: Math.round(element.getBoundingClientRect().height),
      })),
      tableLeaks: tableLeaks.length,
      offscreenControls: offscreenControls.map((element) => accessibleName(element).slice(0, 80) || element.tagName),
      missingFocusStyles: missingFocusStyles.map((element) => accessibleName(element).slice(0, 80) || element.tagName),
    };
  });
}

for (const route of criticalRoutes) {
  for (const viewport of viewports) {
    test(`${route} has no overflow and valid mobile basics at ${viewport.id}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.locator("main").waitFor({ state: "visible" });

      const health = await uiHealth(page);
      expect(health.scrollWidth, `${route} overflowed at ${viewport.id}`).toBeLessThanOrEqual(health.viewportWidth);
      expect(health.unnamedInteractive, `${route} has unnamed buttons or links at ${viewport.id}`).toBe(0);
      expect(health.imagesWithoutAlt, `${route} has images without alt at ${viewport.id}`).toBe(0);
      expect(health.smallTargets, `${route} has undersized tap targets at ${viewport.id}`).toEqual([]);
      expect(health.tableLeaks, `${route} has uncontained tables at ${viewport.id}`).toBe(0);
      expect(health.offscreenControls, `${route} has offscreen controls at ${viewport.id}`).toEqual([]);
      expect(health.missingFocusStyles, `${route} has focusable controls without visible focus styling at ${viewport.id}`).toEqual([]);
    });
  }
}

test("seller dashboard sidebar collapses at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/seller", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("complementary").first()).not.toBeVisible();
  await expect(page.getByRole("button", { name: /open workspace navigation/i })).toBeVisible();
});

test("admin dashboard sidebar collapses at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("complementary").first()).not.toBeVisible();
  await expect(page.getByRole("button", { name: /open workspace navigation/i })).toBeVisible();
});

test("seller mobile drawer opens, labels navigation, and restores body scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/seller", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /open workspace navigation/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("link", { name: /dashboard/i })).toBeVisible();
  await page.getByRole("button", { name: /^close$/i }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
});

test("admin mobile drawer opens and closes accessibly", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /open workspace navigation/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("link", { name: /dashboard/i })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("seller product tables stay contained on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/seller/products", { waitUntil: "domcontentloaded" });
  const tableLeakCount = await page.locator("table").evaluateAll((tables) =>
    tables.filter((table) => table.scrollWidth > window.innerWidth && !table.closest(".responsive-table-shell, [class*='overflow-x-auto']")).length,
  );
  expect(tableLeakCount).toBe(0);
});
