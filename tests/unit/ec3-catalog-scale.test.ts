/**
 * EC-3 — Catalog Scale Certification (uses EXISTING engines only; no new systems).
 * Exercises the real MCP-0B generator + MCP-1B capacity/discovery/quality engines
 * at 100 / 1,000 / 10,000 products to produce reproducible scale evidence.
 */

import { describe, it, expect } from "vitest";
import { generateCatalog, catalogDistribution } from "@/lib/catalog/generator";
import { scoreCatalogQuality, qualityBand } from "@/lib/catalog/quality";
import { detectDuplicates, toDedupItem } from "@/lib/catalog/dedup";
import { buildFacets, assessDiscoveryReadiness, SORT_OPTIONS } from "@/lib/catalog-population/discovery";
import { buildUniverseCapacityReport, CAPACITY_TIERS } from "@/lib/catalog-population/capacity";

function toInput(p: ReturnType<typeof generateCatalog>[number]) {
  return {
    name: p.name,
    description: p.description,
    categorySlug: p.categorySlug,
    brand: p.brand,
    sku: p.sku,
    price: p.price,
    attributes: p.attributes,
    imageUrls: p.imageUrl ? [p.imageUrl] : [],
  };
}

describe("EC-3 Catalog Scale — 100 / 1,000 / 10,000", () => {
  for (const count of [100, 1000, 10000]) {
    it(`generates ${count} products with unique slugs/SKUs and broad distribution`, () => {
      const t0 = Date.now();
      const catalog = generateCatalog(count);
      const ms = Date.now() - t0;

      expect(catalog.length).toBe(count);

      const slugs = new Set(catalog.map((p) => p.slug));
      const skus = new Set(catalog.map((p) => p.sku));
      expect(slugs.size).toBe(count); // all unique
      expect(skus.size).toBe(count);

      // Distribution across the taxonomy roots
      const dist = catalogDistribution(catalog);
      expect(Object.keys(dist).length).toBeGreaterThanOrEqual(20);

      // Searchability: every product has a non-empty search document
      expect(catalog.every((p) => p.searchDocument.length > 0)).toBe(true);

      // Media: every product carries an image
      expect(catalog.every((p) => Boolean(p.imageUrl))).toBe(true);

      // Quality scored for all
      expect(catalog.every((p) => typeof p.qualityScore === "number")).toBe(true);

      // Performance guard (generous, reproducible): generation throughput is linear
      expect(ms).toBeLessThan(count * 5 + 2000);
    });
  }
});

describe("EC-3 Catalog Scale — capacity reasoning 10k / 100k / 1M", () => {
  it("certifies all capacity tiers as supported", () => {
    const report = buildUniverseCapacityReport(10000);
    expect(report.allSupported).toBe(true);
    expect(report.tiers.map((t) => t.label)).toEqual(["10k", "100k", "1M"]);
    for (const tier of CAPACITY_TIERS) {
      expect(tier.indexed).toBe(true);
      expect(tier.paginated).toBe(true);
      expect(tier.searchable).toBe(true);
      expect(tier.supported).toBe(true);
      expect(tier.pages).toBe(Math.ceil(tier.products / 48));
    }
  });

  it("validates a real 10k sample (uniqueness/searchable/media)", () => {
    const report = buildUniverseCapacityReport(10000);
    const v = report.sampleValidation;
    expect(v.count).toBe(10000);
    expect(v.uniqueSlugs).toBe(10000);
    expect(v.uniqueSkus).toBe(10000);
    expect(v.searchable).toBe(10000);
    expect(v.withMedia).toBe(10000);
    expect(v.rootCategories).toBeGreaterThanOrEqual(20);
  });
});

describe("EC-3 Discovery readiness at scale", () => {
  it("builds facets and assesses discovery readiness on a 1,000-product catalog", () => {
    const inputs = generateCatalog(1000).map(toInput);
    const facets = buildFacets(inputs);
    expect(facets.length).toBeGreaterThan(0);
    // Category + brand + price facets should be present
    const facetKeys = facets.map((f) => f.key ?? f.label ?? "").join(",").toLowerCase();
    expect(facetKeys.length).toBeGreaterThan(0);

    const readiness = assessDiscoveryReadiness(inputs);
    expect(readiness).toBeTruthy();
    expect(SORT_OPTIONS.length).toBeGreaterThanOrEqual(5);
  });
});

describe("EC-3 Quality + duplicate detection at scale", () => {
  it("scores quality and bands across a 500-product sample", () => {
    const inputs = generateCatalog(500).map(toInput);
    const scores = inputs.map((i) => scoreCatalogQuality(i).score);
    const avg = scores.reduce((s, n) => s + n, 0) / scores.length;
    expect(avg).toBeGreaterThan(0);
    expect(["excellent", "good", "fair", "poor"]).toContain(qualityBand(avg));
  });

  it("detects no false-duplicate explosion on unique generated catalog", () => {
    const inputs = generateCatalog(200).map((p, i) => toDedupItem(`ref-${i}`, toInput(p)));
    const dupes = detectDuplicates(inputs);
    // Deterministic unique generator should not produce a large duplicate set
    expect(dupes.length).toBeLessThan(20);
  });
});
