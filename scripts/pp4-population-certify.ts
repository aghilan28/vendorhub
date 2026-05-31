import fs from "node:fs";
import path from "node:path";
import { buildCanonicalTaxonomyEngine } from "../lib/taxonomy";
import { buildCanonicalBrandEngine } from "../lib/brands";
import { validateProducts } from "../lib/products";
import {
  baseDatasetSize,
  buildDiscoverySurfaces,
  buildProductUniverse,
  buildStorefrontCatalog,
  computeCoverage,
  computePopulationMetrics,
  computeQuality,
  runPopulationScaleCertification,
} from "../lib/product-population";

const PREFERRED_TARGET = 50_000;

const taxonomy = buildCanonicalTaxonomyEngine();
const brands = buildCanonicalBrandEngine();

const universe = buildProductUniverse({ brands, taxonomy, target: PREFERRED_TARGET });
const metrics = computePopulationMetrics(universe);
const validation = validateProducts(universe.engine.products(), { taxonomy, brands });
const surfaces = buildDiscoverySurfaces(universe.engine);
const coverage = computeCoverage(universe.engine, brands, surfaces.discoverableIds);
const quality = computeQuality(universe.engine, brands, taxonomy);
const storefront = buildStorefrontCatalog();
const scale = runPopulationScaleCertification([10_000, 50_000, 100_000], { brands, taxonomy });

const report = {
  generatedAt: new Date().toISOString(),
  wave: "PP-4",
  subject: "Product Universe Population System",
  population: {
    baseRealCatalog: baseDatasetSize(brands),
    populatedProducts: metrics.totalProducts,
    totalVariants: metrics.totalVariants,
    totalSkus: metrics.totalSkus,
    departmentsCovered: metrics.departmentsCovered,
    brandsCovered: metrics.brandsCovered,
    averageVariantsPerProduct: metrics.averageVariantsPerProduct,
    productsPerDepartment: metrics.productsPerDepartment,
  },
  integrity: { valid: validation.valid, errors: validation.errorCount, warnings: validation.warningCount },
  coverage,
  quality: {
    averageScore: quality.averageScore,
    attributeCompletenessPct: quality.attributeCompletenessPct,
    incompleteProducts: quality.incompleteProducts,
    duplicateProducts: quality.duplicateProducts,
    brokenBrandMappings: quality.brokenBrandMappings,
    brokenTaxonomyMappings: quality.brokenTaxonomyMappings,
  },
  storefrontActivation: { products: storefront.products.length, categories: storefront.categories.length, featured: storefront.featured.length },
  scaleCertification: scale,
  completionCriteria: {
    populatedUniverse: metrics.totalProducts >= 10_000,
    homepageNotEmpty: storefront.products.length > 0,
    searchReturnsProducts: coverage.searchCoveragePct === 100,
    categoriesContainProducts: coverage.emptyDepartments.length === 0,
    brandsContainProducts: metrics.brandsCovered > 0,
    discoverySurfacesContainProducts: coverage.discoveryCoveragePct === 100,
    scaleCertified: scale.every((r) => r.valid && r.traversalOk && r.performanceOk),
    qualityAcceptable: quality.attributeCompletenessPct >= 95 && validation.valid,
  },
};

const outDir = path.join(process.cwd(), "docs", "pp4", "generated");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "population-certification.json");
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

const allPass = validation.valid && Object.values(report.completionCriteria).every(Boolean);
console.log(`PP-4 population certification ${allPass ? "PASSED" : "FAILED"}.`);
console.log(`  Base real catalog: ${report.population.baseRealCatalog}; populated universe: ${metrics.totalProducts} products, ${metrics.totalVariants} variants.`);
console.log(`  Coverage: ${coverage.departmentsCovered}/${coverage.departmentsTargeted} departments, search ${coverage.searchCoveragePct}%, discovery ${coverage.discoveryCoveragePct}%.`);
console.log(`  Quality: avg ${quality.averageScore}, attribute completeness ${quality.attributeCompletenessPct}%.`);
console.log(`  Storefront activation: ${storefront.products.length} products on display.`);
console.log(`  Scale: ${scale.map((r) => `${r.targetProducts}:${r.valid && r.traversalOk ? "ok" : "fail"}`).join(", ")}`);
console.log(`  Report written to ${path.relative(process.cwd(), outPath)}.`);

if (!allPass) process.exit(1);
