import { describe, expect, it } from "vitest";
import { distanceKm, deliveryFeasibility, rankProductsByGeo } from "@/lib/geo/spatial";
import { searchMarketplaceProducts } from "@/features/intelligence/search-ranking";
import { getHomepageRecommendations } from "@/features/intelligence/recommendations";
import { createProduct, createVendor, multilingualProducts, reliabilityBuyerLocation } from "../utils/fixtures";

describe("geo reliability", () => {
  it("rejects invalid coordinates instead of inventing distance", () => {
    expect(distanceKm({ latitude: 999, longitude: 77 }, reliabilityBuyerLocation)).toBeNull();
    expect(distanceKm(null, reliabilityBuyerLocation)).toBeNull();
  });

  it("marks sellers outside service radius without hiding diagnostic distance", () => {
    const vendor = createVendor({ latitude: 13.2, longitude: 77.7, serviceRadiusKm: 2 });
    const feasibility = deliveryFeasibility(vendor, reliabilityBuyerLocation);

    expect(feasibility.status).toBe("outside_radius");
    expect(feasibility.distanceKm).toBeGreaterThan(2);
    expect(feasibility.etaMinutes).toBeNull();
  });

  it("ranks feasible nearby products ahead of distant products", () => {
    const near = createProduct({ id: "near", vendor: createVendor({ id: "near-vendor", latitude: 12.972, longitude: 77.641, serviceRadiusKm: 5 }) });
    const far = createProduct({ id: "far", vendor: createVendor({ id: "far-vendor", latitude: 13.1, longitude: 77.8, serviceRadiusKm: 30 }) });

    expect(rankProductsByGeo([far, near], reliabilityBuyerLocation, 40)[0].product.id).toBe("near");
  });
});

describe("AI and multilingual reliability", () => {
  it("degrades gracefully with suggestions when the query has no direct commerce meaning", () => {
    const result = searchMarketplaceProducts(
      "zzzz impossible product",
      multilingualProducts(),
      { category: "all", availability: "available", sort: "intelligent", radiusKm: 6, nearbyOnly: false },
      reliabilityBuyerLocation,
      "en",
    );

    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.alternatives.length).toBeGreaterThan(0);
    expect(result.latencyMs).toBeGreaterThan(0);
    expect(result.intelligence.summary.length).toBeGreaterThan(20);
  });

  it("handles Hindi transliteration for mobile cover discovery", () => {
    const result = searchMarketplaceProducts(
      "mobile cover",
      multilingualProducts(),
      { category: "all", availability: "available", sort: "intelligent", radiusKm: 6, nearbyOnly: false },
      reliabilityBuyerLocation,
      "hi",
    );

    expect(result.results[0]?.product.id).toBe("prod-mobile-cover");
    expect(result.intelligence.confidence).not.toBe("fallback");
  });

  it("excludes out-of-stock recommendations from homepage reliability paths", () => {
    const recommendations = getHomepageRecommendations(multilingualProducts(), [], 5, { isNewUser: true });

    expect(recommendations.every((item) => item.product.stockCount > 0)).toBe(true);
  });
});
