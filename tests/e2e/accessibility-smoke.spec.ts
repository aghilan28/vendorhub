import { expect, test } from "@playwright/test";

const publicRoutes = ["/launch", "/offline", "/demo", "/admin/platform-health"];

test.describe("critical flow accessibility smoke", () => {
  for (const route of publicRoutes) {
    test(`${route} exposes a navigable page landmark`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator("body")).toBeVisible();
      await expect(page.locator("main, [role='main']").first()).toBeVisible();
    });
  }
});
