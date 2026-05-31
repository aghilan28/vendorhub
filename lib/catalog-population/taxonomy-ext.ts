// MCP-1B Phase 3 — Advanced Taxonomy System (deterministic, pure).
//
// Extends the MCP-0B taxonomy with collections, brand hierarchies, a tag system
// and a taxonomy audit (coverage/depth). Reuses `taxonomyNodes`/`rootCategories`/
// `leafCategories`/`categoryPath`.

import { categoryPath, leafCategories, rootCategories, taxonomyNodes, type CatalogProductInput } from "@/lib/catalog";
import type { BrandNode, Collection, TaxonomyAudit } from "./types";

/** Derive brand hierarchy (brand → product count + categories) from products. */
export function buildBrandHierarchy(products: CatalogProductInput[]): BrandNode[] {
  const map = new Map<string, { count: number; categories: Set<string> }>();
  for (const p of products) {
    const brand = p.brand?.trim();
    if (!brand) continue;
    const entry = map.get(brand) ?? { count: 0, categories: new Set<string>() };
    entry.count += 1;
    const root = categoryPath(p.categorySlug)[0]?.name;
    if (root) entry.categories.add(root);
    map.set(brand, entry);
  }
  return [...map.entries()]
    .map(([brand, e]) => ({ brand, productCount: e.count, categories: [...e.categories].sort() }))
    .sort((a, b) => b.productCount - a.productCount);
}

/** Derive a tag system from product attributes + category keywords. */
export function buildTags(products: CatalogProductInput[]): Array<{ tag: string; count: number }> {
  const map = new Map<string, number>();
  for (const p of products) {
    for (const value of Object.values(p.attributes ?? {})) {
      const tag = String(value).toLowerCase().trim();
      if (tag.length > 1 && tag.length < 24) map.set(tag, (map.get(tag) ?? 0) + 1);
    }
  }
  return [...map.entries()].map(([tag, count]) => ({ tag, count })).filter((t) => t.count > 1).sort((a, b) => b.count - a.count).slice(0, 30);
}

export interface CollectionRuleInput {
  id: string;
  name: string;
  description: string;
  rule: Collection["rule"];
}

/** Materialise a collection by counting matching products. */
export function buildCollection(def: CollectionRuleInput, products: CatalogProductInput[]): Collection {
  const matches = products.filter((p) => matchesRule(p, def.rule));
  return { ...def, productCount: matches.length };
}

function matchesRule(product: CatalogProductInput, rule: Collection["rule"]): boolean {
  switch (rule.kind) {
    case "category":
      return categoryPath(product.categorySlug).some((n) => n.slug === rule.value) || product.categorySlug === rule.value;
    case "brand":
      return (product.brand ?? "").toLowerCase() === rule.value.toLowerCase();
    case "tag":
      return Object.values(product.attributes ?? {}).some((v) => String(v).toLowerCase() === rule.value.toLowerCase());
    case "price_below":
      return product.price < Number(rule.value);
    default:
      return false;
  }
}

/** Audit the taxonomy + catalog coverage. */
export function auditTaxonomy(products: CatalogProductInput[], collections: Collection[] = []): TaxonomyAudit {
  const roots = new Set<string>();
  const usedCategories = new Set<string>();
  for (const p of products) {
    usedCategories.add(p.categorySlug);
    const root = categoryPath(p.categorySlug)[0]?.slug;
    if (root) roots.add(root);
  }
  const categoriesWithProducts = usedCategories.size;
  const emptyCategories = Math.max(0, taxonomyNodes.length - categoriesWithProducts);
  const coverage = taxonomyNodes.length ? Math.round((categoriesWithProducts / taxonomyNodes.length) * 100) : 0;

  return {
    rootCategories: rootCategories.length,
    totalNodes: taxonomyNodes.length,
    maxDepth: Math.max(0, ...taxonomyNodes.map((n) => n.depth)),
    categoriesWithProducts,
    emptyCategories,
    coverage,
    brands: buildBrandHierarchy(products).length,
    tags: buildTags(products).length,
    collections: collections.length,
  };
}

export { leafCategories, rootCategories };
