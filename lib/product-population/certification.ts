import type { BrandEngine } from "@/lib/brands";
import { ProductEngine, buildProductSearchIndex, validateProducts } from "@/lib/products";
import type { TaxonomyEngine } from "@/lib/taxonomy";
import { generateProductDataset } from "./dataset";
import { buildDiscoverySurfaces } from "./discovery";

export interface PopulationScaleResult {
  targetProducts: number;
  generatedProducts: number;
  totalVariants: number;
  totalSkus: number;
  valid: boolean;
  errorCount: number;
  skuCollisions: number;
  departmentsCovered: number;
  brandsCovered: number;
  searchCoveragePct: number;
  discoveryCoveragePct: number;
  traversalOk: boolean;
  performanceOk: boolean;
  buildMs: number;
}

export interface CertificationContext {
  brands: BrandEngine;
  taxonomy: TaxonomyEngine;
  performanceBudgetMs?: number;
}

/** Certifies the populated universe at a target product count (Phase 12). */
export function certifyPopulationTarget(target: number, context: CertificationContext): PopulationScaleResult {
  const budget = context.performanceBudgetMs ?? 30_000;
  const start = Date.now();
  const inputs = generateProductDataset(context.brands, target);
  const engine = ProductEngine.fromInputs(inputs);
  const report = validateProducts(engine.products(), { taxonomy: context.taxonomy, brands: context.brands });
  const buildMs = Date.now() - start;

  const searchIndex = buildProductSearchIndex(engine, { brands: context.brands });
  const searchable = searchIndex.filter((doc) => doc.tokens.length > 0).length;
  const surfaces = buildDiscoverySurfaces(engine);

  const departments = new Set(engine.products().map((p) => p.departmentId));
  const brandsCovered = new Set(engine.products().map((p) => p.brandId).filter(Boolean) as string[]).size;
  const sampleProduct = engine.products()[0];
  const firstVariant = sampleProduct?.variants[0];
  const traversalOk = Boolean(
    sampleProduct &&
      engine.getProductBySlug(sampleProduct.slug)?.id === sampleProduct.id &&
      firstVariant &&
      engine.getBySku(firstVariant.internalSku)?.product.id === sampleProduct.id &&
      engine.getProductsByDepartment(sampleProduct.departmentId).length > 0,
  );

  const total = engine.productCount || 1;
  return {
    targetProducts: target,
    generatedProducts: engine.productCount,
    totalVariants: engine.totalVariants,
    totalSkus: engine.skuRegistrySize,
    valid: report.valid && engine.skuCollisions().length === 0,
    errorCount: report.errorCount,
    skuCollisions: engine.skuCollisions().length,
    departmentsCovered: departments.size,
    brandsCovered,
    searchCoveragePct: Number(((searchable / total) * 100).toFixed(1)),
    discoveryCoveragePct: Number(((surfaces.discoverableIds.size / total) * 100).toFixed(1)),
    traversalOk,
    performanceOk: buildMs <= budget,
    buildMs,
  };
}

export function runPopulationScaleCertification(
  targets: number[] = [10_000, 50_000, 100_000],
  context: CertificationContext,
): PopulationScaleResult[] {
  return targets.map((target) => certifyPopulationTarget(target, context));
}
