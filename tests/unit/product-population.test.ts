import { describe, expect, it } from "vitest";
import { buildCanonicalTaxonomyEngine, createDeterministicClock } from "@/lib/taxonomy";
import { buildCanonicalBrandEngine } from "@/lib/brands";
import { validateProducts } from "@/lib/products";
import {
  TARGET_DEPARTMENTS,
  baseDatasetSize,
  buildDiscoverySurfaces,
  buildProductUniverse,
  buildStorefrontCatalog,
  certifyPopulationTarget,
  computeCoverage,
  computePopulationMetrics,
  computeQuality,
  generateProductDataset,
} from "@/lib/product-population";
import { marketplaceProducts, marketplaceCategories } from "@/features/marketplace/lib/data";

function fixedClock() {
  return createDeterministicClock(1_700_000_000_000, 1_000);
}

const taxonomy = buildCanonicalTaxonomyEngine({ clock: fixedClock() });
const brands = buildCanonicalBrandEngine({ clock: fixedClock() });
const universe = buildProductUniverse({ brands, taxonomy, clock: fixedClock() });

describe("product generation (Phases 2, 9)", () => {
  it("generates a real base catalog of thousands of products", () => {
    expect(baseDatasetSize(brands)).toBeGreaterThan(5000);
    expect(universe.engine.productCount).toBeGreaterThan(5000);
  });

  it("produces real brand+template products (not lorem ipsum)", () => {
    expect(universe.engine.getProductBySlug("amul-butter")).toBeDefined();
    expect(universe.engine.getProductBySlug("dove-shampoo")).toBeDefined();
    const shampoo = universe.engine.getProductBySlug("dove-shampoo");
    expect(shampoo?.variants.map((v) => v.axes.volume)).toContain("180ml");
  });
});

describe("mapping (Phases 3, 4)", () => {
  it("maps every product to a real brand and real department; no integrity failures", () => {
    const report = validateProducts(universe.engine.products(), { taxonomy, brands });
    expect(report.valid).toBe(true);
    expect(report.errorCount).toBe(0);
  });

  it("covers every target department (no empty department)", () => {
    const metrics = computePopulationMetrics(universe);
    expect(metrics.departmentsCovered).toBe(TARGET_DEPARTMENTS.length);
    for (const dept of TARGET_DEPARTMENTS) {
      expect(universe.engine.getProductsByDepartment(dept).length).toBeGreaterThan(0);
    }
  });

  it("populates real variants using the PP-3 variant system", () => {
    const butter = universe.engine.getProductBySlug("amul-butter");
    expect(butter && butter.variants.length).toBeGreaterThanOrEqual(2);
    expect(butter?.variants.every((v) => v.internalSku.startsWith("VH-"))).toBe(true);
  });
});

describe("coverage (Phases 5, 6, 8)", () => {
  const surfaces = buildDiscoverySurfaces(universe.engine);
  const coverage = computeCoverage(universe.engine, brands, surfaces.discoverableIds);

  it("achieves 100% search and discovery coverage and full department coverage", () => {
    expect(coverage.searchCoveragePct).toBe(100);
    expect(coverage.discoveryCoveragePct).toBe(100);
    expect(coverage.emptyDepartments).toHaveLength(0);
    expect(coverage.departmentCoveragePct).toBe(100);
  });

  it("achieves 95%+ attribute completeness (quality engine)", () => {
    const quality = computeQuality(universe.engine, brands, taxonomy);
    expect(quality.attributeCompletenessPct).toBeGreaterThanOrEqual(95);
    expect(quality.brokenBrandMappings).toBe(0);
    expect(quality.brokenTaxonomyMappings).toBe(0);
    expect(quality.averageScore).toBeGreaterThanOrEqual(90);
  });
});

describe("homepage & category activation (Phase 11)", () => {
  it("activates the storefront fallback with real products", () => {
    expect(marketplaceProducts.length).toBeGreaterThan(0);
    expect(marketplaceCategories.length).toBeGreaterThan(0);
    const sample = marketplaceProducts[0];
    expect(sample.name.length).toBeGreaterThan(0);
    expect(sample.vendor).toBeDefined();
    expect(sample.category.slug.length).toBeGreaterThan(0);
    expect(sample.price).toBeGreaterThan(0);
  });

  it("builds a storefront catalog with categories that contain products", () => {
    const catalog = buildStorefrontCatalog();
    expect(catalog.products.length).toBeGreaterThan(0);
    expect(catalog.categories.every((category) => (category.productCount ?? 0) > 0)).toBe(true);
    expect(catalog.featured.length).toBeGreaterThan(0);
  });
});

describe("determinism", () => {
  it("generates an identical dataset across runs", () => {
    const a = JSON.stringify(generateProductDataset(brands, 200));
    const b = JSON.stringify(generateProductDataset(brands, 200));
    expect(a).toBe(b);
  });
});

describe("scale certification (Phase 12)", () => {
  it("certifies 10,000 / 50,000 / 100,000 products", () => {
    for (const target of [10_000, 50_000, 100_000]) {
      const result = certifyPopulationTarget(target, { brands, taxonomy });
      expect(result.valid).toBe(true);
      expect(result.errorCount).toBe(0);
      expect(result.skuCollisions).toBe(0);
      expect(result.traversalOk).toBe(true);
      expect(result.performanceOk).toBe(true);
      expect(result.searchCoveragePct).toBe(100);
      expect(result.departmentsCovered).toBeGreaterThanOrEqual(19);
    }
  }, 120_000);
});
