import type { BrandEngine } from "@/lib/brands";
import { ProductEngine } from "@/lib/products";
import type { TaxonomyEngine } from "@/lib/taxonomy";
import { generateProductDataset } from "@/lib/product-population";
import { assignMedia } from "./generator";
import { validateMediaSets } from "./validation";
import { THUMBNAIL_VARIANTS } from "./types";

export interface MediaScaleResult {
  targetProducts: number;
  generatedProducts: number;
  totalAssets: number;
  productsWithPrimary: number;
  coveragePct: number;
  validationErrors: number;
  storefrontActivated: boolean;
  performanceOk: boolean;
  buildMs: number;
}

export interface MediaCertificationContext {
  brands: BrandEngine;
  taxonomy: TaxonomyEngine;
  performanceBudgetMs?: number;
}

/**
 * Certifies media at a target product count (Phase 12). Builds the populated universe, streams media
 * assignment (coverage + asset counts, memory-bounded), validates a representative sample, and checks
 * storefront activation + performance.
 */
export function certifyMediaScaleTarget(target: number, context: MediaCertificationContext): MediaScaleResult {
  const budget = context.performanceBudgetMs ?? 30_000;
  const start = Date.now();
  const engine = ProductEngine.fromInputs(generateProductDataset(context.brands, target));

  let withPrimary = 0;
  let totalAssets = 0;
  let storefrontActivated = true;
  const sample = [];
  for (const product of engine.products()) {
    const set = assignMedia({ id: product.id, name: product.name });
    if (set.primary) withPrimary += 1;
    totalAssets += set.gallery.length;
    if (Object.keys(set.thumbnails).length !== THUMBNAIL_VARIANTS.length) storefrontActivated = false;
    if (sample.length < 1000) sample.push(set);
  }
  const validation = validateMediaSets(sample);
  const buildMs = Date.now() - start;
  const total = engine.productCount || 1;

  return {
    targetProducts: target,
    generatedProducts: engine.productCount,
    totalAssets,
    productsWithPrimary: withPrimary,
    coveragePct: Number(((withPrimary / total) * 100).toFixed(1)),
    validationErrors: validation.errorCount,
    storefrontActivated,
    performanceOk: buildMs <= budget,
    buildMs,
  };
}

export function runMediaScaleCertification(
  targets: number[] = [10_000, 50_000, 100_000],
  context: MediaCertificationContext,
): MediaScaleResult[] {
  return targets.map((target) => certifyMediaScaleTarget(target, context));
}
