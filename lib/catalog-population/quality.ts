// MCP-1B Phase 7 — Catalog Quality Platform (deterministic, pure).
//
// Aggregates per-product quality (MCP-0B `scoreCatalogQuality`), media quality,
// attribute completeness and duplicate risk into a catalog health score with
// governance recommendations. Operates on real CatalogProductInput[].

import { detectDuplicates, qualityBand, scoreCatalogQuality, toDedupItem, type CatalogProductInput } from "@/lib/catalog";
import type { CatalogQualityReport, CatalogRecommendation, Severity, Tone } from "./types";

function tone(score: number): Tone {
  if (score >= 85) return "healthy";
  if (score >= 70) return "watch";
  if (score >= 50) return "degraded";
  return "critical";
}

function rec(kind: CatalogRecommendation["kind"], severity: Severity, title: string, detail: string, action: string): CatalogRecommendation {
  const score = { critical: 92, warning: 76, watch: 58, opportunity: 46, info: 30 }[severity];
  return { id: `cat-rec-${kind}`, kind, severity, title, detail, action, score };
}

/** Attribute completeness 0..100 for a product (provided / expected). */
function attributeCompleteness(product: CatalogProductInput): number {
  const provided = Object.keys(product.attributes ?? {}).length;
  // expect ~4 meaningful attributes per product
  return Math.min(100, Math.round((provided / 4) * 100));
}

export function buildCatalogQualityReport(products: CatalogProductInput[]): CatalogQualityReport {
  const total = products.length;
  if (total === 0) {
    return {
      products: 0,
      catalogHealth: 0,
      tone: "critical",
      averageProductQuality: 0,
      averageMediaQuality: 0,
      attributeCompleteness: 0,
      duplicateRisk: 0,
      withMedia: 0,
      withoutMedia: 0,
      poorQuality: 0,
      bands: { excellent: 0, good: 0, fair: 0, poor: 0 },
      recommendations: [rec("coverage", "warning", "Empty catalog", "No products to assess.", "Import or create products to populate the catalog.")],
    };
  }

  const qualities = products.map((p) => scoreCatalogQuality(p).score);
  const averageProductQuality = Math.round(qualities.reduce((s, q) => s + q, 0) / total);
  const withMedia = products.filter((p) => (p.imageUrls?.length ?? 0) > 0).length;
  const withoutMedia = total - withMedia;
  const averageMediaQuality = Math.round((withMedia / total) * 100);
  const attributeCompletenessAvg = Math.round(products.reduce((s, p) => s + attributeCompleteness(p), 0) / total);

  const bands = { excellent: 0, good: 0, fair: 0, poor: 0 };
  for (const q of qualities) bands[qualityBand(q)] += 1;
  const poorQuality = bands.poor;

  // duplicate risk from near/exact/SKU duplicate matches
  const dupes = detectDuplicates(products.map((p, i) => toDedupItem(p.sku ?? p.externalId ?? String(i), p)));
  const duplicateRisk = Math.min(100, Math.round((dupes.length / total) * 100));

  // catalog health blends the dimensions, penalised by duplicate risk
  const catalogHealth = Math.max(
    0,
    Math.min(100, Math.round(averageProductQuality * 0.4 + averageMediaQuality * 0.25 + attributeCompletenessAvg * 0.25 + (100 - duplicateRisk) * 0.1)),
  );

  const recommendations: CatalogRecommendation[] = [];
  if (withoutMedia > 0) recommendations.push(rec("media", withoutMedia > total * 0.3 ? "warning" : "watch", "Add product media", `${withoutMedia} products have no images.`, "Bulk-upload images via the media population engine."));
  if (attributeCompletenessAvg < 60) recommendations.push(rec("attributes", "watch", "Improve attribute completeness", `Average completeness ${attributeCompletenessAvg}%.`, "Fill required attributes for filtering and search."));
  if (duplicateRisk > 10) recommendations.push(rec("duplicates", duplicateRisk > 25 ? "warning" : "watch", "Resolve duplicate listings", `${dupes.length} potential duplicates (${duplicateRisk}% risk).`, "Review the duplicate queue and merge/remove duplicates."));
  if (poorQuality > 0) recommendations.push(rec("quality", poorQuality > total * 0.2 ? "warning" : "watch", "Improve low-quality listings", `${poorQuality} products score poorly.`, "Add descriptions, media and attributes to raise quality."));
  if (catalogHealth >= 85) recommendations.push(rec("coverage", "opportunity", "Catalog is healthy — expand", "Quality is high.", "Add variants and expand into adjacent categories."));

  return {
    products: total,
    catalogHealth,
    tone: tone(catalogHealth),
    averageProductQuality,
    averageMediaQuality,
    attributeCompleteness: attributeCompletenessAvg,
    duplicateRisk,
    withMedia,
    withoutMedia,
    poorQuality,
    bands,
    recommendations: recommendations.sort((a, b) => b.score - a.score),
  };
}
