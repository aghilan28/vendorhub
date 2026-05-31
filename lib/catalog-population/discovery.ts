// MCP-1B Phase 8 — Product Discovery Readiness (deterministic, pure).
//
// Assesses whether products can be found: builds facets (category/brand/price/
// attributes), filterable attributes, sort options, search coverage and a
// readiness score. Reuses MCP-0B `buildSearchDocument` for searchability.

import { buildSearchDocument, categoryPath, type CatalogProductInput } from "@/lib/catalog";
import type { Collection, DiscoveryReadiness, Facet, Tone } from "./types";

function tone(score: number): Tone {
  if (score >= 85) return "healthy";
  if (score >= 70) return "watch";
  if (score >= 50) return "degraded";
  return "critical";
}

const PRICE_BUCKETS: Array<{ label: string; min: number; max: number }> = [
  { label: "Under ₹250", min: 0, max: 250 },
  { label: "₹250–₹1,000", min: 250, max: 1000 },
  { label: "₹1,000–₹5,000", min: 1000, max: 5000 },
  { label: "₹5,000+", min: 5000, max: Infinity },
];

function countBy<T>(items: T[], key: (item: T) => string | undefined): Array<{ value: string; count: number }> {
  const map = new Map<string, number>();
  for (const item of items) {
    const value = key(item);
    if (!value) continue;
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  return [...map.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count);
}

export const SORT_OPTIONS = ["relevance", "price_low_high", "price_high_low", "newest", "rating", "popularity"];

export function buildFacets(products: CatalogProductInput[]): Facet[] {
  const facets: Facet[] = [];

  // category (root name)
  const categoryFacet = countBy(products, (p) => categoryPath(p.categorySlug)[0]?.name ?? p.categorySlug);
  if (categoryFacet.length) facets.push({ key: "category", label: "Category", values: categoryFacet.slice(0, 12) });

  // brand
  const brandFacet = countBy(products, (p) => p.brand);
  if (brandFacet.length) facets.push({ key: "brand", label: "Brand", values: brandFacet.slice(0, 12) });

  // price buckets
  const priceValues = PRICE_BUCKETS.map((bucket) => ({
    value: bucket.label,
    count: products.filter((p) => p.price >= bucket.min && p.price < bucket.max).length,
  })).filter((v) => v.count > 0);
  if (priceValues.length) facets.push({ key: "price", label: "Price", values: priceValues });

  // filterable attribute facets (top attribute keys)
  const attrKeys = new Set<string>();
  for (const p of products) for (const k of Object.keys(p.attributes ?? {})) attrKeys.add(k);
  for (const key of [...attrKeys].slice(0, 4)) {
    const values = countBy(products, (p) => {
      const v = p.attributes?.[key];
      return v === undefined ? undefined : String(v);
    });
    if (values.length > 1) facets.push({ key: `attr:${key}`, label: key, values: values.slice(0, 8) });
  }

  return facets;
}

export function assessDiscoveryReadiness(products: CatalogProductInput[], collections: Collection[] = []): DiscoveryReadiness {
  const total = products.length;
  const searchable = products.filter((p) => buildSearchDocument(p).length > 0).length;
  const facets = buildFacets(products);
  const categoriesCovered = new Set(products.map((p) => categoryPath(p.categorySlug)[0]?.slug ?? p.categorySlug)).size;
  const filterableAttributes = facets.filter((f) => f.key.startsWith("attr:")).map((f) => f.label);

  const searchCoverage = total ? Math.round((searchable / total) * 100) : 0;
  const facetScore = Math.min(100, facets.length * 18);
  const readinessScore = total
    ? Math.round(searchCoverage * 0.5 + facetScore * 0.3 + Math.min(100, categoriesCovered * 8) * 0.2)
    : 0;

  const gaps: string[] = [];
  if (searchCoverage < 100 && total > 0) gaps.push(`${total - searchable} products have no search document.`);
  if (!facets.some((f) => f.key === "brand")) gaps.push("No brand facet — add brands for filtering.");
  if (filterableAttributes.length === 0 && total > 0) gaps.push("No filterable attributes — add structured attributes.");
  if (collections.length === 0) gaps.push("No collections — create curated collections for navigation.");

  return {
    products: total,
    searchableProducts: searchable,
    searchCoverage,
    facets,
    filterableAttributes,
    sortOptions: SORT_OPTIONS,
    categoriesCovered,
    collections: collections.length,
    readinessScore,
    tone: tone(readinessScore),
    gaps,
  };
}
