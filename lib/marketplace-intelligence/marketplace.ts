// MCP-0E.8 — Marketplace-level intelligence: health, risk, growth, insights.
// Consumes the fabric + demand/inventory/pricing engine outputs.

import type {
  DemandIntelligence,
  GrowthOpportunity,
  InventoryIntelligence,
  MarketplaceFabric,
  MarketplaceHealth,
  MarketplaceInsight,
  MarketplaceRisk,
  PricingIntelligence,
  Tone,
} from "./types";

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toneFor(score: number): Tone {
  if (score >= 80) return "healthy";
  if (score >= 65) return "watch";
  if (score >= 45) return "degraded";
  return "critical";
}

export function computeMarketplaceHealth(
  fabric: MarketplaceFabric,
  inventory: InventoryIntelligence,
  pricing: PricingIntelligence,
): MarketplaceHealth {
  const total = fabric.products.length || 1;
  const withSales = fabric.products.filter((p) => p.unitsSold > 0).length;
  const demandScore = clamp((withSales / total) * 100);

  const inventoryScore = inventory.healthScore;

  const belowMarginShare = fabric.products.filter((p) => p.marginPct < 10).length / total;
  const pricingScore = clamp(50 + pricing.averageMarginPct - belowMarginShare * 50);

  const reviews = fabric.totals.reviews || 1;
  const flaggedShare = fabric.totals.flaggedReviews / reviews;
  const trustScore = clamp(100 - flaggedShare * 40 - Math.min(40, fabric.totals.openDisputes * 5) - Math.min(20, fabric.totals.openRefunds * 2));

  const cancellationRate = fabric.totals.orders ? (fabric.stores.reduce((s, st) => s + st.cancellations, 0) / fabric.totals.orders) * 100 : 0;
  const fulfillmentScore = clamp(100 - cancellationRate * 3);

  const score = clamp(demandScore * 0.2 + inventoryScore * 0.2 + pricingScore * 0.15 + trustScore * 0.25 + fulfillmentScore * 0.2);

  return { score, tone: toneFor(score), demandScore, inventoryScore, pricingScore, trustScore, fulfillmentScore };
}

export function detectMarketplaceRisks(
  fabric: MarketplaceFabric,
  demand: DemandIntelligence,
  inventory: InventoryIntelligence,
  pricing: PricingIntelligence,
): MarketplaceRisk[] {
  const risks: MarketplaceRisk[] = [];

  // Inventory stockouts with demand → critical.
  for (const s of inventory.signals.filter((sig) => sig.risk === "stockout").slice(0, 8)) {
    risks.push({
      kind: "inventory_risk",
      severity: "critical",
      scope: "product",
      refId: s.productId,
      title: `Stockout risk: ${s.name}`,
      detail: s.rationale,
      recommendedAction: s.suggestedReorder > 0 ? `Reorder ~${s.suggestedReorder} units` : "Restock immediately",
    });
  }

  // Below-cost pricing → pricing risk.
  for (const s of pricing.signals.filter((sig) => sig.marginPct < 0).slice(0, 6)) {
    risks.push({
      kind: "pricing_risk",
      severity: "warning",
      scope: "product",
      refId: s.productId,
      title: `Below-cost price: ${s.name}`,
      detail: s.rationale,
      recommendedAction: "Raise price to restore margin",
    });
  }

  // Demand collapse on published, in-stock products.
  for (const sig of demand.signals.filter((d) => d.kind === "risk").slice(0, 6)) {
    risks.push({
      kind: "demand_risk",
      severity: sig.severity,
      scope: sig.scope,
      refId: sig.refId,
      title: sig.title,
      detail: sig.detail,
      recommendedAction: "Promote, re-merchandise, or delist",
    });
  }

  // Seller risk — high cancellation / disputes.
  for (const store of fabric.stores.filter((s) => s.cancellationRate > 10 || s.disputes > 0 || s.returnRate > 20)) {
    risks.push({
      kind: "seller_risk",
      severity: store.disputes > 0 ? "critical" : "warning",
      scope: "store",
      refId: store.sellerId,
      title: `Seller risk: ${store.name}`,
      detail: `Cancellations ${store.cancellationRate}%, returns ${store.returnRate}%, disputes ${store.disputes}.`,
      recommendedAction: "Open a governance review for this seller",
    });
  }

  // Trust risk — flagged reviews / disputes at marketplace scale.
  if (fabric.totals.flaggedReviews > 0 || fabric.totals.openDisputes > 0) {
    risks.push({
      kind: "trust_risk",
      severity: fabric.totals.openDisputes > 2 ? "warning" : "watch",
      scope: "marketplace",
      refId: "marketplace",
      title: "Trust signals require attention",
      detail: `${fabric.totals.flaggedReviews} flagged reviews and ${fabric.totals.openDisputes} open disputes.`,
      recommendedAction: "Route to Trust Governance for moderation/arbitration",
    });
  }

  // Marketplace-wide availability risk.
  const oosShare = fabric.totals.totalProducts ? fabric.totals.outOfStock / fabric.totals.totalProducts : 0;
  if (oosShare >= 0.2) {
    risks.push({
      kind: "marketplace_risk",
      severity: oosShare >= 0.4 ? "critical" : "warning",
      scope: "marketplace",
      refId: "marketplace",
      title: "High out-of-stock rate",
      detail: `${Math.round(oosShare * 100)}% of products are out of stock.`,
      recommendedAction: "Coordinate seller replenishment and demand smoothing",
    });
  }

  return risks;
}

export function detectGrowthOpportunities(
  fabric: MarketplaceFabric,
  demand: DemandIntelligence,
  pricing: PricingIntelligence,
): GrowthOpportunity[] {
  const growth: GrowthOpportunity[] = [];

  // Category expansion — strong rating, healthy demand, low OOS.
  for (const cat of fabric.categories.filter((c) => c.avgRating >= 4 && c.outOfStock === 0).slice(0, 3)) {
    growth.push({
      kind: "category_expansion",
      scope: "category",
      refId: cat.category,
      title: `Expand ${cat.category}`,
      detail: `${cat.avgRating}★ avg across ${cat.products} products, ${cat.share}% of revenue, no stockouts.`,
      action: `Add SKUs and feature ${cat.category}`,
      potential: cat.share >= 25 ? "high" : "medium",
    });
  }

  // Demand surges → restock + feature.
  for (const sig of demand.signals.filter((d) => d.kind === "opportunity").slice(0, 5)) {
    growth.push({
      kind: "demand_surge",
      scope: "product",
      refId: sig.refId,
      title: sig.title,
      detail: sig.detail,
      action: "Restock and feature on discovery surfaces",
      potential: "high",
    });
  }

  // Pricing headroom.
  for (const s of pricing.signals.filter((sig) => sig.recommendation === "raise" && sig.marginPct >= 0).slice(0, 4)) {
    growth.push({
      kind: "pricing_headroom",
      scope: "product",
      refId: s.productId,
      title: `Pricing headroom: ${s.name}`,
      detail: s.rationale,
      action: "Test a 3-5% price increase",
      potential: "medium",
    });
  }

  // Seller growth — top revenue store.
  const topStore = [...fabric.stores].sort((a, b) => b.revenue - a.revenue)[0];
  if (topStore && topStore.revenue > 0) {
    growth.push({
      kind: "seller_growth",
      scope: "store",
      refId: topStore.sellerId,
      title: `Scale top seller: ${topStore.name}`,
      detail: `Rs ${topStore.revenue.toLocaleString("en-IN")} revenue across ${topStore.products} products.`,
      action: "Offer growth tools (ads, bundles, capacity)",
      potential: "high",
    });
  }

  // Discovery gap — views but low conversion.
  for (const product of fabric.products.filter((p) => p.views >= 5 && p.conversionPct < 20).slice(0, 4)) {
    growth.push({
      kind: "discovery_gap",
      scope: "product",
      refId: product.productId,
      title: `Discovery gap: ${product.name}`,
      detail: `${product.views} views but ${product.conversionPct}% conversion.`,
      action: "Improve media, price, or trust signals on the PDP",
      potential: "medium",
    });
  }

  return growth;
}

export function buildMarketplaceInsights(
  health: MarketplaceHealth,
  fabric: MarketplaceFabric,
  demand: DemandIntelligence,
  inventory: InventoryIntelligence,
  pricing: PricingIntelligence,
): MarketplaceInsight[] {
  return [
    {
      domain: "marketplace",
      severity: health.tone === "healthy" ? "info" : health.tone === "critical" ? "critical" : "warning",
      title: `Marketplace health ${health.score}/100 (${health.tone})`,
      detail: `Demand ${health.demandScore} · Inventory ${health.inventoryScore} · Pricing ${health.pricingScore} · Trust ${health.trustScore} · Fulfilment ${health.fulfillmentScore}.`,
    },
    {
      domain: "demand",
      severity: "info",
      title: `Demand run-rate ${demand.marketplaceRunRate}/day`,
      detail: `~${demand.marketplaceForecast30d} units projected over 30 days across ${fabric.totals.totalProducts} products.`,
    },
    {
      domain: "inventory",
      severity: inventory.stockoutCount > 0 ? "warning" : "info",
      title: `${inventory.stockoutCount} stockout risks · ${inventory.overstockCount} overstock`,
      detail: `Reorder ~${inventory.reorderUnits} units to restore 14-day cover.`,
    },
    {
      domain: "pricing",
      severity: pricing.belowMarginCount > 0 ? "warning" : "info",
      title: `Avg margin ${pricing.averageMarginPct}% · ${pricing.belowMarginCount} below healthy margin`,
      detail: pricing.promotionGuidance[0] ?? "Pricing is well-positioned across the catalog.",
    },
  ];
}
