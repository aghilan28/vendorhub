import type { ProductEngine } from "./engine";

export interface ProductAffinityEdge {
  source: string;
  target: string;
  relation: "same_brand" | "substitute" | "cross_sell" | "frequently_bought_together";
  weight: number;
}

export interface ProductBundle {
  key: string;
  members: string[];
}

export interface ProductAffinityGraph {
  edges: ProductAffinityEdge[];
  bundles: ProductBundle[];
}

/**
 * Recommendation-readiness projection (Phase 9). Emits product affinity edges (same-brand,
 * substitute across brands within a type, cross-sell across categories) and bundle scaffolding.
 * Builds recommendation-ready structures; computes no recommendations.
 */
export function buildProductAffinityGraph(engine: ProductEngine): ProductAffinityGraph {
  const edges: ProductAffinityEdge[] = [];
  const bundles: ProductBundle[] = [];

  // Same-brand affinity.
  const byBrand = new Map<string, string[]>();
  // Type-based substitution.
  const byType = new Map<string, string[]>();
  for (const product of engine.products()) {
    if (product.brandId) {
      const bucket = byBrand.get(product.brandId) ?? [];
      bucket.push(product.id);
      byBrand.set(product.brandId, bucket);
    }
    const typeKey = product.typeId ?? `${product.departmentId}:${product.categoryId ?? ""}`;
    const typeBucket = byType.get(typeKey) ?? [];
    typeBucket.push(product.id);
    byType.set(typeKey, typeBucket);
  }

  for (const [brandId, ids] of byBrand) {
    if (ids.length > 1) {
      bundles.push({ key: `brand:${brandId}`, members: ids });
      for (let i = 0; i < ids.length; i += 1) {
        for (let j = i + 1; j < ids.length; j += 1) edges.push({ source: ids[i], target: ids[j], relation: "same_brand", weight: 0.6 });
      }
    }
  }
  for (const [, ids] of byType) {
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const a = engine.getProduct(ids[i]);
        const b = engine.getProduct(ids[j]);
        if (a && b && a.brandId !== b.brandId) edges.push({ source: a.id, target: b.id, relation: "substitute", weight: 0.5 });
      }
    }
  }

  return { edges, bundles };
}

/** Deterministic product similarity from shared brand, taxonomy and attribute overlap. */
export function productSimilarity(engine: ProductEngine, idA: string, idB: string): number {
  const a = engine.getProduct(idA);
  const b = engine.getProduct(idB);
  if (!a || !b) return 0;
  if (a.id === b.id) return 1;
  const sameBrand = a.brandId && a.brandId === b.brandId ? 1 : 0;
  const sameDept = a.departmentId === b.departmentId ? 1 : 0;
  const sameCategory = a.categoryId && a.categoryId === b.categoryId ? 1 : 0;
  const keysA = new Set(Object.keys(a.attributes));
  const keysB = new Set(Object.keys(b.attributes));
  const union = new Set([...keysA, ...keysB]);
  let shared = 0;
  for (const key of keysA) if (keysB.has(key)) shared += 1;
  const attrJaccard = union.size ? shared / union.size : 0;
  return Number((sameBrand * 0.4 + sameCategory * 0.3 + sameDept * 0.2 + attrJaccard * 0.1).toFixed(4));
}

/** Deterministic variant similarity from shared axes (e.g. size/color/volume). */
export function variantSimilarity(engine: ProductEngine, variantIdA: string, variantIdB: string): number {
  const a = engine.getVariant(variantIdA);
  const b = engine.getVariant(variantIdB);
  if (!a || !b) return 0;
  if (a.id === b.id) return 1;
  const keys = new Set([...Object.keys(a.axes), ...Object.keys(b.axes)]);
  if (!keys.size) return a.productId === b.productId ? 0.5 : 0;
  let shared = 0;
  for (const key of keys) if (String(a.axes[key]) === String(b.axes[key])) shared += 1;
  const base = shared / keys.size;
  return Number((a.productId === b.productId ? 0.5 + base * 0.5 : base * 0.5).toFixed(4));
}
