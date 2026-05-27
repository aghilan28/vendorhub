import { test, expect } from "@playwright/test";

test.describe("Buyer critical path", () => {
  test("homepage loads with products", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator('[data-testid="product-card"]').first()).toBeVisible({ timeout: 10000 });
  });

  test("search returns results", async ({ page }) => {
    await page.goto("/search?q=rice");
    await expect(page.locator('[data-testid="search-result"], [data-testid="product-card"]').first()).toBeVisible({ timeout: 10000 });
  });

  test("cart add is accessible", async ({ page }) => {
    await page.goto("/");
    const addBtn = page.locator('[data-testid="add-to-cart"]').first();
    await expect(addBtn).toBeVisible();
    await expect(addBtn).toHaveAttribute("aria-label");
  });

  test("checkout page has no keyboard traps", async ({ page }) => {
    await page.goto("/cart");
    for (let i = 0; i < 10; i += 1) await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"]).toContain(focused);
  });
});
