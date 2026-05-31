// MCP-1B Phase 9 — Seller Catalog Operations (deterministic, pure).
//
// Combines catalog quality, import health and media health into a seller
// catalog snapshot with prioritized alerts and a daily catalog briefing.

import type { CatalogProductInput } from "@/lib/catalog";
import { buildCatalogQualityReport } from "./quality";
import { planMediaPopulation } from "./media-population";
import type { CatalogAlert, MediaAssetInput, SellerCatalogSnapshot, Severity } from "./types";

function alert(kind: CatalogAlert["kind"], severity: Severity, title: string, detail: string, href: string): CatalogAlert {
  return { id: `cat-alert-${kind}`, kind, severity, title, detail, href };
}

function rank(severity: Severity): number {
  return { critical: 5, warning: 4, watch: 3, opportunity: 2, info: 1 }[severity];
}

export interface SellerCatalogInput {
  sellerId: string;
  products: CatalogProductInput[];
  publishedProducts?: number;
  media?: MediaAssetInput[];
  importPublishRate?: number; // 0..100 from import analytics
}

export function buildSellerCatalogSnapshot(input: SellerCatalogInput): SellerCatalogSnapshot {
  const quality = buildCatalogQualityReport(input.products);
  const published = input.publishedProducts ?? input.products.length;
  const mediaReport = input.media && input.media.length ? planMediaPopulation(input.media) : null;

  const importHealth = Math.round(input.importPublishRate ?? (input.products.length ? 100 : 0));
  const mediaHealth = mediaReport ? mediaReport.averageQuality : quality.averageMediaQuality;

  const alerts: CatalogAlert[] = [];
  if (quality.withoutMedia > 0) alerts.push(alert("media", quality.withoutMedia > quality.products * 0.3 ? "warning" : "watch", "Products missing media", `${quality.withoutMedia} products have no images.`, "/seller/import"));
  if (quality.attributeCompleteness < 60) alerts.push(alert("quality", "watch", "Low attribute completeness", `Average ${quality.attributeCompleteness}%.`, "/seller/products"));
  if (quality.duplicateRisk > 10) alerts.push(alert("duplicate", quality.duplicateRisk > 25 ? "warning" : "watch", "Possible duplicate listings", `${quality.duplicateRisk}% duplicate risk.`, "/seller/catalog"));
  if (quality.poorQuality > 0) alerts.push(alert("quality", "watch", "Low-quality listings", `${quality.poorQuality} products score poorly.`, "/seller/products"));
  if (importHealth < 80 && input.products.length > 0) alerts.push(alert("import", "watch", "Import publish rate low", `Publish rate ${importHealth}%.`, "/seller/import"));
  if (input.products.length === 0) alerts.push(alert("coverage", "warning", "Catalog is empty", "Import or create products to populate your store.", "/seller/import"));

  const catalogHealth = Math.round(quality.catalogHealth * 0.6 + mediaHealth * 0.2 + importHealth * 0.2);

  const briefing = [
    `${input.products.length} products (${published} published), catalog health ${quality.catalogHealth}/100.`,
    `Media: ${quality.withMedia}/${quality.products} have images (quality ${mediaHealth}/100).`,
    `Attributes ${quality.attributeCompleteness}% complete · duplicate risk ${quality.duplicateRisk}%.`,
    alerts.length ? `${alerts.length} action(s) to improve your catalog.` : "Catalog is in good shape.",
  ];

  return {
    sellerId: input.sellerId,
    products: input.products.length,
    published,
    catalogHealth: Math.max(0, Math.min(100, catalogHealth)),
    importHealth,
    mediaHealth,
    quality,
    alerts: alerts.sort((a, b) => rank(b.severity) - rank(a.severity)),
    briefing,
  };
}
