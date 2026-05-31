// MCP-1B Phase 11 — Product Population Intelligence (deterministic, pure).
//
// Operates on real products/categories/sellers to surface catalog growth
// opportunities, missing categories, category/variant gaps, coverage analysis
// and population forecasts.

import { categoryPath, getCategory, rootCategories, type CatalogProductInput } from "@/lib/catalog";
import { recommendVariantAxes } from "./variants";
import type { CategoryCoverage, PopulationForecast, PopulationIntelligence, PopulationRecommendation, Severity } from "./types";

function sev(severity: Severity): number {
  return { critical: 92, warning: 76, watch: 58, opportunity: 46, info: 30 }[severity];
}

function rec(
  kind: PopulationRecommendation["kind"],
  severity: Severity,
  refId: string,
  title: string,
  detail: string,
  action: string,
): PopulationRecommendation {
  return { id: `pop-${kind}-${refId}`, kind, severity, refId, title, detail, action, score: sev(severity) };
}

export interface PopulationProductInput extends CatalogProductInput {
  sellerId?: string;
  hasVariants?: boolean;
}

export interface PopulationIntelligenceOptions {
  targetProducts?: number;
  recentlyAddedPerDay?: number;
}

export function buildPopulationIntelligence(products: PopulationProductInput[], options: PopulationIntelligenceOptions = {}): PopulationIntelligence {
  const targetProducts = options.targetProducts ?? 10_000;

  // category coverage by root
  const rootStats = new Map<string, { products: number; sellers: Set<string> }>();
  for (const p of products) {
    const root = categoryPath(p.categorySlug)[0]?.slug ?? p.categorySlug;
    const entry = rootStats.get(root) ?? { products: 0, sellers: new Set<string>() };
    entry.products += 1;
    if (p.sellerId) entry.sellers.add(p.sellerId);
    rootStats.set(root, entry);
  }
  const maxProducts = Math.max(1, ...[...rootStats.values()].map((s) => s.products));

  const coverage: CategoryCoverage[] = rootCategories.map((root) => {
    const stats = rootStats.get(root.slug) ?? { products: 0, sellers: new Set<string>() };
    const cov = Math.round((stats.products / maxProducts) * 100);
    const status: CategoryCoverage["status"] = stats.products === 0 ? "empty" : stats.products < maxProducts * 0.15 ? "thin" : stats.products < maxProducts * 0.5 ? "growing" : "rich";
    return { rootSlug: root.slug, name: root.name, products: stats.products, sellers: stats.sellers.size, coverage: cov, status };
  }).sort((a, b) => b.products - a.products);

  const emptyCategories = coverage.filter((c) => c.status === "empty").map((c) => c.name);
  const thinCategories = coverage.filter((c) => c.status === "thin").map((c) => c.name);

  // recommendations
  const recommendations: PopulationRecommendation[] = [];
  for (const c of coverage.filter((c) => c.status === "empty").slice(0, 5)) {
    recommendations.push(rec("missing_category", "warning", c.rootSlug, `Empty category: ${c.name}`, `No products in "${c.name}".`, `Recruit sellers and import products for ${c.name}.`));
  }
  for (const c of coverage.filter((c) => c.status === "thin").slice(0, 5)) {
    recommendations.push(rec("category_gap", "opportunity", c.rootSlug, `Thin category: ${c.name}`, `Only ${c.products} products in "${c.name}".`, `Expand selection in ${c.name} to improve discovery.`));
  }
  // variant gaps: variant-capable categories with low variant adoption
  const variantCapable = new Map<string, { total: number; withVariants: number }>();
  for (const p of products) {
    const node = getCategory(p.categorySlug);
    if (!node || node.variantAxes.length === 0) continue;
    const e = variantCapable.get(p.categorySlug) ?? { total: 0, withVariants: 0 };
    e.total += 1;
    if (p.hasVariants) e.withVariants += 1;
    variantCapable.set(p.categorySlug, e);
  }
  for (const [slug, e] of [...variantCapable.entries()].slice(0, 5)) {
    if (e.withVariants < e.total * 0.5) {
      const axes = recommendVariantAxes(slug).recommendedAxes;
      recommendations.push(rec("variant_gap", "opportunity", slug, `Variant gap in ${getCategory(slug)?.name ?? slug}`, `${e.total - e.withVariants} products lack variants.`, `Add ${axes.join("/")} variants to complete these listings.`));
    }
  }
  if (products.length > 0 && products.length < targetProducts) {
    recommendations.push(rec("growth_opportunity", "opportunity", "target", "Grow toward catalog target", `${products.length.toLocaleString("en-IN")} of ${targetProducts.toLocaleString("en-IN")} products.`, "Run population imports and recruit catalog-rich sellers."));
  }

  // forecast
  const perDay = options.recentlyAddedPerDay ?? Math.max(1, Math.round(products.length * 0.02));
  const forecast: PopulationForecast = {
    currentProducts: products.length,
    currentCategories: coverage.filter((c) => c.products > 0).length,
    projected30d: products.length + perDay * 30,
    projected90d: products.length + perDay * 90,
    targetProducts,
    targetProgress: Math.min(100, Math.round((products.length / targetProducts) * 100)),
  };

  return {
    coverage,
    recommendations: recommendations.sort((a, b) => b.score - a.score),
    forecast,
    emptyCategories,
    thinCategories,
  };
}
