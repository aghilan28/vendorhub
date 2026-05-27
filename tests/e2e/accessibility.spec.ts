import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const CRITICAL_ROUTES = ["/", "/search", "/cart", "/checkout", "/seller", "/seller/products", "/admin"];

for (const route of CRITICAL_ROUTES) {
  test(`${route} has no critical accessibility violations`, async ({ page }) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .exclude('[data-testid="map-placeholder"]')
      .analyze();
    expect(results.violations.filter((violation) => violation.impact === "critical")).toHaveLength(0);
  });
}
