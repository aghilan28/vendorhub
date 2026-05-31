// MCP-1B Phase 10 — Admin Catalog Governance (deterministic, pure).
//
// Builds the catalog governance queues (catalog / quality / duplicate / media /
// import / risk) and a governance dashboard from real catalog data.

import { detectDuplicates, scoreCatalogQuality, toDedupItem, type CatalogProductInput } from "@/lib/catalog";
import type { CatalogGovernanceSnapshot, CatalogQueue, CatalogQueueItem, CatalogQueueKind, Severity, Tone } from "./types";

function tone(score: number): Tone {
  if (score >= 85) return "healthy";
  if (score >= 70) return "watch";
  if (score >= 50) return "degraded";
  return "critical";
}

function item(ref: string, label: string, queue: CatalogQueueKind, severity: Severity, summary: string): CatalogQueueItem {
  return { id: `${queue}-${ref}`, ref, label, queue, severity, summary };
}

export interface GovernanceProductInput extends CatalogProductInput {
  status?: "active" | "pending" | "draft";
  flagged?: boolean;
}

export function buildCatalogGovernanceSnapshot(products: GovernanceProductInput[]): CatalogGovernanceSnapshot {
  const buckets: Record<CatalogQueueKind, CatalogQueueItem[]> = {
    catalog: [],
    quality: [],
    duplicate: [],
    media: [],
    import: [],
    risk: [],
  };

  const dupes = detectDuplicates(products.map((p, i) => toDedupItem(p.sku ?? p.externalId ?? String(i), p)));
  const dupeRefs = new Set(dupes.map((d) => d.ref));

  let qualitySum = 0;
  for (let i = 0; i < products.length; i += 1) {
    const product = products[i];
    const ref = product.sku ?? product.externalId ?? String(i);
    const quality = scoreCatalogQuality(product);
    qualitySum += quality.score;

    if (product.status === "pending" || product.status === "draft") buckets.catalog.push(item(ref, product.name, "catalog", "watch", `Listing awaiting catalog review (${product.status}).`));
    if (quality.score < 40) buckets.quality.push(item(ref, product.name, "quality", "warning", `Low quality score ${quality.score}.`));
    if (dupeRefs.has(ref)) buckets.duplicate.push(item(ref, product.name, "duplicate", "warning", "Potential duplicate listing."));
    if ((product.imageUrls?.length ?? 0) === 0) buckets.media.push(item(ref, product.name, "media", "watch", "No product media."));
    if (product.flagged) buckets.risk.push(item(ref, product.name, "risk", "critical", "Listing manually flagged."));
  }

  const queues: CatalogQueue[] = (Object.keys(buckets) as CatalogQueueKind[]).map((kind) => ({
    kind,
    label: { catalog: "Catalog review", quality: "Quality", duplicate: "Duplicates", media: "Media", import: "Imports", risk: "Risk" }[kind],
    items: buckets[kind].slice(0, 100),
  }));

  const totalPending = queues.reduce((s, q) => s + q.items.length, 0);
  const published = products.filter((p) => p.status === "active" || p.status === undefined).length;
  const averageQuality = products.length ? Math.round(qualitySum / products.length) : 0;
  const duplicateRisk = products.length ? Math.round((dupes.length / products.length) * 100) : 0;
  const catalogHealth = Math.max(0, Math.min(100, Math.round(averageQuality * 0.7 + (100 - duplicateRisk) * 0.3)));

  return {
    queues,
    totalPending,
    catalogHealth,
    tone: tone(catalogHealth),
    products: products.length,
    publishedProducts: published,
    duplicateRisk,
  };
}
