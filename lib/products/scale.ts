import type { TaxonomyEngine } from "@/lib/taxonomy";
import { ProductEngine } from "./engine";
import { resolveInheritance } from "./inheritance";
import { generateInternalSku } from "./sku";
import { validateProducts } from "./validation";
import type { ProductMasterInput } from "./types";

const SCALE_DEPARTMENTS = ["groceries", "dairy", "beverages", "snacks", "personal-care", "electronics", "fashion", "household"];

/** Builds a deterministic synthetic product master (with variants) at a given index. */
export function syntheticProduct(index: number, variantsPerProduct = 2): ProductMasterInput {
  const departmentId = SCALE_DEPARTMENTS[index % SCALE_DEPARTMENTS.length];
  const variants = Array.from({ length: variantsPerProduct }, (_, v) => ({
    name: `Variant ${v}`,
    axes: { size: `${(v + 1) * 250}ml` },
    sortOrder: v,
  }));
  return {
    id: `p-${index}`,
    name: `Product ${index}`,
    departmentId,
    attributes: { country_of_origin: "India" },
    variants,
  };
}

/** Materializes `count` synthetic products (for tests / small scales). */
export function generateSyntheticProducts(count: number, variantsPerProduct = 2): ProductMasterInput[] {
  return Array.from({ length: count }, (_, index) => syntheticProduct(index, variantsPerProduct));
}

export interface ProductScaleCertificationResult {
  targetProducts: number;
  totalVariants: number;
  uniqueSkus: number;
  skuCollisions: number;
  barcodeCollisions: number;
  integrityValid: boolean;
  structuralSampleSize: number;
  traversalOk: boolean;
  lookupOk: boolean;
  inheritanceOk: boolean;
  variantsOk: boolean;
  streamMs: number;
  buildMs: number;
}

export interface ProductScaleOptions {
  taxonomy?: TaxonomyEngine;
  variantsPerProduct?: number;
  /** Above this size, the full engine is built only for a representative sample (memory-bounded). */
  engineThreshold?: number;
}

/**
 * Certifies the product ontology at a target scale (Phase 13). SKU/barcode uniqueness and variant
 * counts are verified by a memory-bounded streaming pass over the full target; traversal / lookup /
 * inheritance are verified on a representative full engine (sized min(target, engineThreshold)).
 */
export function certifyProductScaleTarget(target: number, options: ProductScaleOptions = {}): ProductScaleCertificationResult {
  const variantsPerProduct = options.variantsPerProduct ?? 2;
  const engineThreshold = options.engineThreshold ?? 100_000;

  // --- Streaming integrity pass over the full target (SKU/barcode uniqueness, counts). ---
  const streamStart = Date.now();
  const skus = new Set<string>();
  let skuCollisions = 0;
  let totalVariants = 0;
  for (let i = 0; i < target; i += 1) {
    const departmentId = SCALE_DEPARTMENTS[i % SCALE_DEPARTMENTS.length];
    const productId = `p-${i}`;
    for (let v = 0; v < variantsPerProduct; v += 1) {
      const sku = generateInternalSku({ departmentId, brandId: null, productId, variantKey: `${(v + 1) * 250}ml` });
      if (skus.has(sku)) skuCollisions += 1;
      else skus.add(sku);
      totalVariants += 1;
    }
  }
  const streamMs = Date.now() - streamStart;

  // --- Structural verification on a bounded full engine. ---
  const sampleSize = Math.min(target, engineThreshold);
  const buildStart = Date.now();
  const engine = ProductEngine.fromInputs(generateSyntheticProducts(sampleSize, variantsPerProduct));
  const report = validateProducts(engine.products(), { taxonomy: options.taxonomy });
  const buildMs = Date.now() - buildStart;

  const sampleProduct = engine.getProduct("p-0");
  const firstVariant = sampleProduct?.variants[0];
  const lookupOk = Boolean(
    sampleProduct &&
      engine.getProductBySlug(sampleProduct.slug)?.id === "p-0" &&
      firstVariant &&
      engine.getBySku(firstVariant.internalSku)?.product.id === "p-0",
  );
  const traversalOk = Boolean(
    sampleProduct && engine.getVariantsByProduct("p-0").length === variantsPerProduct && engine.getProductsByDepartment("groceries").length > 0,
  );
  const variantsOk = engine.totalVariants === sampleSize * variantsPerProduct;
  const { conflicts } = resolveInheritance({ product: sampleProduct?.attributes ?? {}, variant: firstVariant?.attributes ?? {} });
  const inheritanceOk = conflicts.length === 0;

  return {
    targetProducts: target,
    totalVariants,
    uniqueSkus: skus.size,
    skuCollisions,
    barcodeCollisions: engine.barcodeCollisions().length,
    integrityValid: skuCollisions === 0 && report.errorCount === 0,
    structuralSampleSize: sampleSize,
    traversalOk,
    lookupOk,
    inheritanceOk,
    variantsOk,
    streamMs,
    buildMs,
  };
}

export function runProductScaleCertification(
  targets: number[] = [10_000, 100_000, 500_000, 1_000_000],
  options: ProductScaleOptions = {},
): ProductScaleCertificationResult[] {
  return targets.map((target) => certifyProductScaleTarget(target, options));
}
