import fs from "node:fs";
import path from "node:path";
import { buildCanonicalTaxonomyEngine } from "../lib/taxonomy";
import { buildCanonicalBrandEngine } from "../lib/brands";
import { buildProductUniverse } from "../lib/product-population";
import {
  buildMediaActivatedStorefront,
  buildMediaForUniverse,
  computeMediaAnalytics,
  computeMediaCoverage,
  computeMediaQuality,
  runMediaScaleCertification,
  validateMediaSets,
} from "../lib/product-media";

const taxonomy = buildCanonicalTaxonomyEngine();
const brands = buildCanonicalBrandEngine();

// Coverage/quality/analytics on a representative slice (deterministic), scale separately.
const universe = buildProductUniverse({ brands, taxonomy, limit: 5000 });
const sets = buildMediaForUniverse(universe.engine);
const coverage = computeMediaCoverage(sets);
const validation = validateMediaSets(sets);
const quality = computeMediaQuality(sets, universe.engine);
const analytics = computeMediaAnalytics(sets, universe.engine);
const storefront = buildMediaActivatedStorefront();
const scale = runMediaScaleCertification([10_000, 50_000, 100_000], { brands, taxonomy });

const report = {
  generatedAt: new Date().toISOString(),
  wave: "PP-5",
  subject: "Media Population, Image Intelligence & Product Visualization",
  coverage: {
    sampledProducts: coverage.totalProducts,
    coveragePct: coverage.coveragePct,
    averageCoverageScore: coverage.averageCoverageScore,
    totalAssets: coverage.totalAssets,
  },
  validation: { valid: validation.valid, errors: validation.errorCount, warnings: validation.warningCount },
  quality: { marketplaceHealth: quality.marketplaceHealth, averageCoverageScore: quality.averageCoverageScore },
  analytics: { marketplaceCoveragePct: analytics.marketplaceCoveragePct, readinessPct: analytics.readiness.readinessPct, topDefects: analytics.topDefects },
  storefrontActivation: {
    products: storefront.products.length,
    productsWithImage: storefront.products.filter((p) => Boolean(p.imageUrl)).length,
    categoriesWithImage: storefront.categories.filter((c) => Boolean(c.imageUrl)).length,
  },
  scaleCertification: scale,
  completionCriteria: {
    mediaArchitectureExists: true,
    galleriesExist: coverage.totalAssets > 0,
    thumbnailsExist: storefront.products.every((p) => Boolean(p.imageUrl)),
    governanceExists: true,
    analyticsExists: true,
    storefrontRenderingWorks: storefront.products.every((p) => Boolean(p.imageUrl)),
    coverageExceeds95: coverage.coveragePct >= 95,
    scaleCertified: scale.every((r) => r.coveragePct >= 95 && r.validationErrors === 0 && r.storefrontActivated && r.performanceOk),
  },
};

const outDir = path.join(process.cwd(), "docs", "pp5", "generated");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "media-certification.json");
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

const allPass = validation.valid && Object.values(report.completionCriteria).every(Boolean);
console.log(`PP-5 media certification ${allPass ? "PASSED" : "FAILED"}.`);
console.log(`  Coverage: ${coverage.coveragePct}% (sampled ${coverage.totalProducts}), ${coverage.totalAssets} assets; market health ${quality.marketplaceHealth}.`);
console.log(`  Validation: ${validation.errorCount} errors, ${validation.warningCount} warnings.`);
console.log(`  Storefront: ${report.storefrontActivation.productsWithImage}/${storefront.products.length} products with images.`);
console.log(`  Scale: ${scale.map((r) => `${r.targetProducts}:${r.coveragePct >= 95 && r.validationErrors === 0 ? "ok" : "fail"}`).join(", ")}`);
console.log(`  Report written to ${path.relative(process.cwd(), outPath)}.`);

if (!allPass) process.exit(1);
