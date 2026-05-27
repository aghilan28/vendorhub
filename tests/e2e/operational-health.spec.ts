import { expect, test } from "@playwright/test";

test.describe("operational health E2E reliability", () => {
  test("admin platform health surface renders a health or diagnostics-failure state", async ({ page }) => {
    await page.goto("/admin/platform-health-placeholder");

    await expect(page.getByRole("banner").getByRole("heading", { name: "Marketplace command center" })).toBeVisible();
    await expect(page.getByRole("main")).toContainText(/Operational health|Diagnostics fetch failed/i);
  });

  test("diagnostics failure state remains keyboard reachable and actionable", async ({ page }) => {
    await page.goto("/admin/platform-health-placeholder");

    const retry = page.getByRole("button", { name: /Retry|Refresh/i });
    await retry.focus();
    await expect(retry).toBeFocused();
  });
});
