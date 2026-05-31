import { describe, expect, it } from "vitest";
import {
  // import v2
  planImportJob,
  processChunk,
  failChunk,
  retryableChunks,
  importProgress,
  importAnalytics,
  importQueue,
  importCapacity,
  // media
  scoreMediaAsset,
  planMediaPopulation,
  mediaGovernance,
  // variants
  VARIANT_SETS,
  buildVariantSet,
  recommendVariantAxes,
  variantGap,
  // quality
  buildCatalogQualityReport,
  // discovery
  buildFacets,
  assessDiscoveryReadiness,
  SORT_OPTIONS,
  // taxonomy ext
  buildBrandHierarchy,
  buildCollection,
  auditTaxonomy,
  // capacity
  buildUniverseCapacityReport,
  CAPACITY_TIERS,
  // ops
  buildSellerCatalogSnapshot,
  // governance
  buildCatalogGovernanceSnapshot,
  // intelligence
  buildPopulationIntelligence,
  // sample
  SAMPLE_PRODUCTS,
  SAMPLE_PRODUCTS_WITH_GAPS,
  SAMPLE_POPULATION_PRODUCTS,
  SAMPLE_GOVERNANCE_PRODUCTS,
  SAMPLE_MEDIA_ASSETS,
  sampleImportJob,
} from "@/lib/catalog-population";
import type { CatalogProductInput } from "@/lib/catalog";

const AT = "2026-05-31T06:00:00.000Z";

describe("MCP-1B.4 import platform v2", () => {
  it("plans a large import into chunks (50k+ capable)", () => {
    const job = planImportJob("s1", "big.csv", 50_000, 1000, AT);
    expect(job.chunks.length).toBe(50);
    expect(job.state).toBe("queued");
    expect(importCapacity(50_000).supported).toBe(true);
    expect(importCapacity(1_000_000).supported).toBe(true);
  });

  it("processes chunks and tracks progress + analytics", () => {
    let job = planImportJob("s1", "c.csv", 120, 60, AT);
    expect(job.chunks.length).toBe(2);
    job = processChunk(job, 0, SAMPLE_PRODUCTS.slice(0, 60));
    job = processChunk(job, 1, SAMPLE_PRODUCTS.slice(60, 120));
    const progress = importProgress(job);
    expect(progress.percent).toBe(100);
    expect(progress.publishable).toBeGreaterThan(0);
    expect(job.state === "completed" || job.state === "completed_with_errors").toBe(true);
    const analytics = importAnalytics([job]);
    expect(analytics.rows).toBe(120);
    expect(analytics.publishRate).toBeGreaterThan(0);
  });

  it("supports retry of failed chunks under the attempt cap", () => {
    let job = planImportJob("s1", "c.csv", 100, 50, AT);
    job = failChunk(job, 0);
    expect(retryableChunks(job).length).toBe(1);
    expect(importQueue([job])[0].jobId).toBe(job.id);
  });
});

describe("MCP-1B.5 media population", () => {
  it("scores, dedupes and plans transforms", () => {
    const report = planMediaPopulation(SAMPLE_MEDIA_ASSETS);
    expect(report.total).toBe(SAMPLE_MEDIA_ASSETS.length);
    expect(report.duplicates).toBeGreaterThanOrEqual(1); // m4 duplicates m1
    expect(report.toCompress).toBeGreaterThanOrEqual(1); // m2 oversized
    expect(report.assets.find((a) => a.ref === "m5")?.flags).toContain("invalid_url");
    expect(report.assets.find((a) => a.ref === "m3")?.flags).toContain("low_resolution");
  });

  it("gates attachment via governance", () => {
    expect(scoreMediaAsset({ ref: "x", url: "https://x/y.jpg", width: 1200, height: 1200, bytes: 200_000 }).qualityScore).toBeGreaterThan(80);
    const empty = planMediaPopulation([]);
    expect(mediaGovernance(empty).canAttach).toBe(false);
  });
});

describe("MCP-1B.6 variant expansion", () => {
  it("exposes named variant sets and builds unique-SKU variants", () => {
    expect(VARIANT_SETS.length).toBeGreaterThanOrEqual(5);
    const result = buildVariantSet({ setId: "apparel", baseSku: "TS-001", baseName: "Tee", basePrice: 499 });
    expect(result.count).toBeGreaterThan(0);
    expect(result.uniqueSkus).toBe(result.count);
    expect(result.ok).toBe(true);
  });

  it("recommends variant axes from the taxonomy and finds gaps", () => {
    const rec = recommendVariantAxes("pulses-dals");
    expect(Array.isArray(rec.recommendedAxes)).toBe(true);
    const gap = variantGap({ categorySlug: "pulses-dals", productsInCategory: 10, productsWithVariants: 2 });
    expect(gap.gap).toBe(8);
  });
});

describe("MCP-1B.7 catalog quality platform", () => {
  it("computes catalog health from real products", () => {
    const report = buildCatalogQualityReport(SAMPLE_PRODUCTS);
    expect(report.products).toBe(SAMPLE_PRODUCTS.length);
    expect(report.catalogHealth).toBeGreaterThan(0);
    expect(report.catalogHealth).toBeLessThanOrEqual(100);
    expect(report.bands.excellent + report.bands.good + report.bands.fair + report.bands.poor).toBe(report.products);
  });

  it("flags missing media and recommends fixes", () => {
    const report = buildCatalogQualityReport(SAMPLE_PRODUCTS_WITH_GAPS);
    expect(report.withoutMedia).toBeGreaterThan(0);
    expect(report.recommendations.some((r) => r.kind === "media")).toBe(true);
  });

  it("handles an empty catalog", () => {
    const report = buildCatalogQualityReport([]);
    expect(report.products).toBe(0);
    expect(report.tone).toBe("critical");
  });
});

describe("MCP-1B.8 discovery readiness", () => {
  it("builds facets and scores readiness", () => {
    const facets = buildFacets(SAMPLE_PRODUCTS);
    expect(facets.some((f) => f.key === "category")).toBe(true);
    expect(facets.some((f) => f.key === "price")).toBe(true);
    const readiness = assessDiscoveryReadiness(SAMPLE_PRODUCTS);
    expect(readiness.searchCoverage).toBe(100); // generator products all searchable
    expect(readiness.readinessScore).toBeGreaterThan(0);
    expect(readiness.sortOptions).toEqual(SORT_OPTIONS);
  });
});

describe("MCP-1B.3 advanced taxonomy", () => {
  it("derives brand hierarchy, collections and a taxonomy audit", () => {
    const brands = buildBrandHierarchy(SAMPLE_PRODUCTS);
    expect(brands.length).toBeGreaterThan(0);
    const collection = buildCollection({ id: "cheap", name: "Under ₹500", description: "", rule: { kind: "price_below", value: "500" } }, SAMPLE_PRODUCTS);
    expect(collection.productCount).toBeGreaterThanOrEqual(0);
    const audit = auditTaxonomy(SAMPLE_PRODUCTS, [collection]);
    expect(audit.totalNodes).toBeGreaterThan(0);
    expect(audit.rootCategories).toBeGreaterThan(0);
    expect(audit.coverage).toBeGreaterThanOrEqual(0);
  });
});

describe("MCP-1B.2 product universe capacity", () => {
  it("certifies 10k/100k/1M tiers and validates a 10k sample", () => {
    const report = buildUniverseCapacityReport(10_000);
    expect(report.tiers.map((t) => t.label)).toEqual(["10k", "100k", "1M"]);
    expect(report.allSupported).toBe(true);
    expect(report.sampleValidation.count).toBe(10_000);
    expect(report.sampleValidation.uniqueSlugs).toBe(10_000);
    expect(CAPACITY_TIERS.every((t) => t.indexed && t.paginated && t.searchable)).toBe(true);
  });
});

describe("MCP-1B.9 seller catalog operations", () => {
  it("builds a seller catalog snapshot with alerts + briefing", () => {
    const snap = buildSellerCatalogSnapshot({ sellerId: "s1", products: SAMPLE_PRODUCTS_WITH_GAPS });
    expect(snap.catalogHealth).toBeGreaterThan(0);
    expect(snap.alerts.length).toBeGreaterThan(0);
    expect(snap.briefing.length).toBeGreaterThan(0);
  });

  it("tells an empty-catalog seller to populate", () => {
    const snap = buildSellerCatalogSnapshot({ sellerId: "new", products: [] as CatalogProductInput[] });
    expect(snap.alerts.some((a) => a.kind === "coverage")).toBe(true);
  });
});

describe("MCP-1B.10 admin catalog governance", () => {
  it("builds six queues from real products", () => {
    const snap = buildCatalogGovernanceSnapshot(SAMPLE_GOVERNANCE_PRODUCTS);
    expect(snap.queues.length).toBe(6);
    expect(snap.products).toBe(SAMPLE_GOVERNANCE_PRODUCTS.length);
    expect(["healthy", "watch", "degraded", "critical"]).toContain(snap.tone);
    expect(snap.queues.find((q) => q.kind === "media")?.items.length).toBeGreaterThan(0);
  });
});

describe("MCP-1B.11 population intelligence", () => {
  it("computes coverage, gaps, recommendations and a forecast", () => {
    const intel = buildPopulationIntelligence(SAMPLE_POPULATION_PRODUCTS);
    expect(intel.coverage.length).toBeGreaterThan(0);
    expect(intel.forecast.currentProducts).toBe(SAMPLE_POPULATION_PRODUCTS.length);
    expect(intel.forecast.projected90d).toBeGreaterThanOrEqual(intel.forecast.projected30d);
    expect(intel.recommendations.length).toBeGreaterThan(0);
    // ranked by score desc
    for (let i = 1; i < intel.recommendations.length; i++) expect(intel.recommendations[i - 1].score).toBeGreaterThanOrEqual(intel.recommendations[i].score);
    expect(intel.coverage.every((c) => c.coverage >= 0 && c.coverage <= 100)).toBe(true);
    expect(Array.isArray(intel.emptyCategories)).toBe(true);
    expect(intel.recommendations.some((r) => r.kind === "growth_opportunity" || r.kind === "category_gap" || r.kind === "variant_gap")).toBe(true);
  });

  it("sample import job is partially processed", () => {
    const job = sampleImportJob();
    expect(job.totalRows).toBe(5200);
    expect(importProgress(job).doneChunks).toBeGreaterThanOrEqual(2);
  });
});
