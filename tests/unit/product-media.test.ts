import { describe, expect, it } from "vitest";
import { buildCanonicalTaxonomyEngine, createDeterministicClock } from "@/lib/taxonomy";
import { buildCanonicalBrandEngine } from "@/lib/brands";
import { buildProductUniverse } from "@/lib/product-population";
import {
  MediaGovernance,
  addGallerySlot,
  assignMedia,
  buildGallery,
  buildMediaActivatedStorefront,
  buildMediaForUniverse,
  certifyMediaScaleTarget,
  computeMediaAnalytics,
  computeMediaCoverage,
  computeMediaQuality,
  makeImageAsset,
  runMediaScaleCertification,
  validateAssets,
  validateMediaSets,
  type MediaAsset,
} from "@/lib/product-media";
import { marketplaceProducts } from "@/features/marketplace/lib/data";

function fixedClock() {
  return createDeterministicClock(1_700_000_000_000, 1_000);
}

const taxonomy = buildCanonicalTaxonomyEngine({ clock: fixedClock() });
const brands = buildCanonicalBrandEngine({ clock: fixedClock() });
const universe = buildProductUniverse({ brands, taxonomy, limit: 1000, clock: fixedClock() });
const sets = buildMediaForUniverse(universe.engine, { clock: fixedClock() });

function craftAsset(overrides: Partial<MediaAsset>): MediaAsset {
  const base = makeImageAsset({ productId: "p", kind: "PRIMARY", seed: overrides.id ?? "seed-x", width: 800, height: 800, alt: "x", sortOrder: 0, now: "2024-01-01T00:00:00.000Z" });
  return { ...base, ...overrides };
}

describe("media assignment (Phase 3)", () => {
  it("assigns a full media set (primary + gallery + thumbnails)", () => {
    const set = assignMedia({ id: "demo-product", name: "Demo Product" }, { clock: fixedClock() });
    expect(set.primary).toBeDefined();
    expect(set.gallery.length).toBeGreaterThanOrEqual(4);
    expect(Object.keys(set.thumbnails)).toContain("STOREFRONT");
    expect(set.coverageScore).toBe(1);
    expect(set.primary.url.startsWith("https://")).toBe(true);
  });

  it("is deterministic across runs", () => {
    const a = JSON.stringify(assignMedia({ id: "demo-product" }, { clock: fixedClock() }));
    const b = JSON.stringify(assignMedia({ id: "demo-product" }, { clock: fixedClock() }));
    expect(a).toBe(b);
  });
});

describe("gallery operations (Phase 6)", () => {
  it("builds ordered gallery roles and supports unlimited expansion", () => {
    const gallery = buildGallery("p1", { now: "2024-01-01T00:00:00.000Z" });
    expect(gallery.map((a) => a.role)).toEqual(["PRIMARY", "SECONDARY", "PACKAGING", "BRAND", "LIFESTYLE"]);
    const expanded = addGallerySlot(gallery, { role: "VIDEO", kind: "VIDEO", width: 1280, height: 720 }, "p1", "2024-01-01T00:00:00.000Z");
    expect(expanded.length).toBe(gallery.length + 1);
    expect(expanded[expanded.length - 1].role).toBe("VIDEO");
  });
});

describe("validation failures (Phase 4)", () => {
  it("detects broken URLs, invalid dimensions, low quality and unsupported formats", () => {
    const report = validateAssets([
      craftAsset({ id: "a1", url: "not-a-url" }),
      craftAsset({ id: "a2", width: 0, height: 0 }),
      craftAsset({ id: "a3", width: 50, height: 50 }),
      craftAsset({ id: "a4", format: "glb", kind: "GALLERY" }),
    ]);
    const codes = report.issues.map((i) => i.code);
    expect(codes).toContain("BROKEN_URL");
    expect(codes).toContain("INVALID_DIMENSIONS");
    expect(codes).toContain("LOW_QUALITY");
    expect(codes).toContain("UNSUPPORTED_FORMAT");
  });

  it("detects duplicate assets by checksum", () => {
    const report = validateAssets([craftAsset({ id: "dup1", checksum: "SAME" }), craftAsset({ id: "dup2", checksum: "SAME" })]);
    expect(report.issues.map((i) => i.code)).toContain("DUPLICATE_ASSET");
  });

  it("detects missing primary in a media set", () => {
    const broken = { productId: "x", primary: undefined as unknown as MediaAsset, gallery: [], thumbnails: {} as never, coverageScore: 0 };
    const report = validateMediaSets([broken]);
    expect(report.issues.map((i) => i.code)).toContain("MISSING_PRIMARY");
  });

  it("passes the populated media universe cleanly", () => {
    const report = validateMediaSets(sets);
    expect(report.valid).toBe(true);
    expect(report.errorCount).toBe(0);
  });
});

describe("coverage, quality & analytics (Phases 7, 10)", () => {
  it("reports 100% coverage and full health for the populated sample", () => {
    const coverage = computeMediaCoverage(sets);
    expect(coverage.coveragePct).toBe(100);
    expect(coverage.averageCoverageScore).toBe(1);
    const quality = computeMediaQuality(sets, universe.engine);
    expect(quality.marketplaceHealth).toBe(100);
    expect(quality.perCategory.length).toBeGreaterThan(0);
  });

  it("produces marketplace analytics with coverage, brand/category and defects", () => {
    const analytics = computeMediaAnalytics(sets, universe.engine);
    expect(analytics.marketplaceCoveragePct).toBe(100);
    expect(analytics.readiness.readinessPct).toBe(100);
    expect(analytics.brandCoverage.length).toBeGreaterThan(0);
    expect(analytics.categoryCoverage.length).toBeGreaterThan(0);
  });
});

describe("media governance (Phase 9)", () => {
  it("approves, rejects, archives, restores, replaces and versions with audit + approval", () => {
    const seed = buildGallery("gov-prod", { now: "2024-01-01T00:00:00.000Z" });
    const governance = new MediaGovernance(seed, { clock: fixedClock() });
    const target = seed[0].id;
    expect(governance.approve(target, "admin").status).toBe("ACTIVE");
    expect(governance.reject(target, "admin").status).toBe("REJECTED");
    expect(governance.archive(target, "admin").status).toBe("ARCHIVED");
    expect(governance.restore(target, "admin").status).toBe("ACTIVE");
    const replaced = governance.replace(target, "https://picsum.photos/seed/replaced/800/800", "admin");
    expect(replaced.url).toContain("replaced");
    expect(replaced.version).toBeGreaterThan(1);
    expect(governance.audit().map((a) => a.operation)).toContain("REPLACE");

    const request = governance.submitChangeRequest("ARCHIVE", { id: target }, "editor");
    expect(governance.approveChangeRequest(request.id, "approver").request.status).toBe("APPLIED");
  });
});

describe("storefront media activation (Phase 8)", () => {
  it("attaches image URLs to storefront products and categories", () => {
    const catalog = buildMediaActivatedStorefront();
    expect(catalog.products.every((p) => Boolean(p.imageUrl))).toBe(true);
    expect(catalog.categories.every((c) => Boolean(c.imageUrl))).toBe(true);
  });

  it("activates the live marketplace fallback with images (no blank cards)", () => {
    expect(marketplaceProducts.length).toBeGreaterThan(0);
    expect(marketplaceProducts.every((p) => Boolean(p.imageUrl))).toBe(true);
  });
});

describe("scale certification (Phase 12)", () => {
  it("certifies media at 10,000 / 50,000 / 100,000 products", () => {
    const results = runMediaScaleCertification([10_000, 50_000], { brands, taxonomy });
    for (const result of results) {
      expect(result.coveragePct).toBe(100);
      expect(result.validationErrors).toBe(0);
      expect(result.storefrontActivated).toBe(true);
      expect(result.performanceOk).toBe(true);
    }
    const big = certifyMediaScaleTarget(100_000, { brands, taxonomy });
    expect(big.coveragePct).toBe(100);
    expect(big.validationErrors).toBe(0);
  }, 120_000);
});
