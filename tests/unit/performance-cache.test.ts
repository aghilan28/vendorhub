import { describe, expect, it, vi } from "vitest";
import { boundedPageSize, performanceBudgets, queryCachePolicy } from "@/lib/performance/cache-policy";
import { clearRequestCache, stableCacheKey, withRequestCache } from "@/lib/performance/request-cache";

describe("phase 26 performance cache policy", () => {
  it("bounds page sizes for scalable list endpoints", () => {
    expect(boundedPageSize(undefined, 24, 60)).toBe(24);
    expect(boundedPageSize(0, 24, 60)).toBe(1);
    expect(boundedPageSize(500, 24, 60)).toBe(60);
  });

  it("keeps critical cache policies below dashboard cache windows", () => {
    expect(queryCachePolicy.criticalCommerce.staleTime).toBeLessThan(queryCachePolicy.dashboards.staleTime);
    expect(performanceBudgets.checkoutP95Ms).toBeLessThanOrEqual(900);
  });

  it("dedupes concurrent cache loads and expires by ttl", async () => {
    vi.useFakeTimers();
    clearRequestCache();
    const loader = vi.fn(async () => ({ loadedAt: Date.now() }));
    const key = stableCacheKey(["burst", { b: 2, a: 1 }]);

    const [first, second] = await Promise.all([
      withRequestCache(key, { ttlMs: 1000 }, loader),
      withRequestCache(key, { ttlMs: 1000 }, loader),
    ]);

    expect(first).toBe(second);
    expect(loader).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1001);
    await withRequestCache(key, { ttlMs: 1000 }, loader);

    expect(loader).toHaveBeenCalledTimes(2);
  });
});
