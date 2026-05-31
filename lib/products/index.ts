import { buildCanonicalTaxonomyEngine, createDeterministicClock, type TaxonomyEngine } from "@/lib/taxonomy";
import { buildCanonicalBrandEngine, type BrandEngine } from "@/lib/brands";
import { ProductEngine, type ProductEngineOptions } from "./engine";
import { CANONICAL_SAMPLE_PRODUCTS } from "./sample-products";

export * from "./types";
export { ProductEngine, resolveProducts } from "./engine";
export type { ProductEngineOptions, SkuLookupResult } from "./engine";
export { generateInternalSku, buildVariantAxisCode, fnv1a36, stableHash, UniqueRegistry } from "./sku";
export type { SkuGenerationInput } from "./sku";
export { resolveInheritance, flattenResolved } from "./inheritance";
export type { InheritanceLayers, InheritanceOptions, InheritanceResult } from "./inheritance";
export { validateProducts } from "./validation";
export type { ProductValidationOptions } from "./validation";
export { ProductGovernance } from "./governance";
export type { ProductGovernanceOptions, SplitPart } from "./governance";
export { buildProductSearchIndex, productsForSearchTerm } from "./search";
export type { ProductSearchDocument, ProductSearchOptions } from "./search";
export { buildProductAffinityGraph, productSimilarity, variantSimilarity } from "./recommendation";
export type { ProductAffinityEdge, ProductAffinityGraph, ProductBundle } from "./recommendation";
export { buildProductIntelligenceProjection, PRODUCT_INTELLIGENCE_HOOKS } from "./intelligence";
export type { ProductIntelligenceHook, ProductIntelligenceProjection } from "./intelligence";
export { syntheticProduct, generateSyntheticProducts, certifyProductScaleTarget, runProductScaleCertification } from "./scale";
export type { ProductScaleCertificationResult, ProductScaleOptions } from "./scale";
export { CANONICAL_SAMPLE_PRODUCTS } from "./sample-products";

/** Builds a product engine from the small illustrative sample (not population). */
export function buildSampleProductEngine(options: ProductEngineOptions = {}): ProductEngine {
  return ProductEngine.fromInputs(CANONICAL_SAMPLE_PRODUCTS, { clock: options.clock ?? createDeterministicClock() });
}

export interface ProductSystemOptions extends ProductEngineOptions {
  taxonomy?: TaxonomyEngine;
  brands?: BrandEngine;
}

/** Builds the product system bound to PP-1 taxonomy and PP-2 brands (using the sample products). */
export function buildSampleProductSystem(options: ProductSystemOptions = {}): {
  engine: ProductEngine;
  taxonomy: TaxonomyEngine;
  brands: BrandEngine;
} {
  const engine = buildSampleProductEngine(options);
  const taxonomy = options.taxonomy ?? buildCanonicalTaxonomyEngine();
  const brands = options.brands ?? buildCanonicalBrandEngine();
  return { engine, taxonomy, brands };
}
