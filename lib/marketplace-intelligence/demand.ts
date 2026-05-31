// MCP-0E.3 — Demand Intelligence Engine.
// Operates on the fabric (orders/behaviour/inventory) to produce demand
// forecasts, trends, risks and opportunities per product/category/store/marketplace.

import type {
  DemandForecast,
  DemandIntelligence,
  DemandSignal,
  MarketplaceFabric,
  ProductFacts,
} from "./types";

function round(value: number, dp = 0) {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

function confidence(p: { unitsSold: number; reviewCount: number; views: number }) {
  return Math.min(95, 40 + p.unitsSold * 2 + Math.min(20, p.reviewCount * 2) + (p.views > 0 ? 15 : 0));
}

/** Relative demand momentum within a product's category (cross-sectional). */
function trendFor(product: ProductFacts, categoryAvgVelocity: number): DemandForecast["trend"] {
  if (product.velocityPerDay <= 0) return "declining";
  if (categoryAvgVelocity <= 0) return "flat";
  if (product.velocityPerDay >= categoryAvgVelocity * 1.2) return "rising";
  if (product.velocityPerDay <= categoryAvgVelocity * 0.6) return "declining";
  return "flat";
}

export function analyzeDemand(fabric: MarketplaceFabric): DemandIntelligence {
  const categoryAvgVelocity = new Map<string, number>();
  for (const cat of fabric.categories) {
    categoryAvgVelocity.set(cat.category, cat.products ? cat.velocityPerDay / cat.products : 0);
  }

  const forecasts: DemandForecast[] = [];

  // Product-level forecasts (top movers + any with stockout pressure).
  const ranked = [...fabric.products].sort((a, b) => b.velocityPerDay - a.velocityPerDay);
  for (const product of ranked.slice(0, 12)) {
    const trend = trendFor(product, categoryAvgVelocity.get(product.category) ?? 0);
    forecasts.push({
      scope: "product",
      refId: product.productId,
      label: product.name,
      dailyRunRate: product.velocityPerDay,
      expectedUnits7d: round(product.velocityPerDay * 7),
      expectedUnits30d: round(product.velocityPerDay * 30),
      trend,
      confidence: confidence(product),
    });
  }

  // Category-level forecasts.
  for (const cat of fabric.categories) {
    forecasts.push({
      scope: "category",
      refId: cat.category,
      label: cat.category,
      dailyRunRate: cat.velocityPerDay,
      expectedUnits7d: round(cat.velocityPerDay * 7),
      expectedUnits30d: round(cat.velocityPerDay * 30),
      trend: cat.velocityPerDay > 0 ? "flat" : "declining",
      confidence: Math.min(90, 45 + cat.unitsSold),
    });
  }

  // Store-level forecasts.
  for (const store of fabric.stores) {
    const runRate = round(store.unitsSold / Math.max(1, fabric.windowDays), 2);
    forecasts.push({
      scope: "store",
      refId: store.sellerId,
      label: store.name,
      dailyRunRate: runRate,
      expectedUnits7d: round(runRate * 7),
      expectedUnits30d: round(runRate * 30),
      trend: runRate > 0 ? "flat" : "declining",
      confidence: Math.min(90, 45 + store.unitsSold),
    });
  }

  // Marketplace-level forecast.
  const marketplaceRunRate = round(
    fabric.products.reduce((s, p) => s + p.velocityPerDay, 0),
    2,
  );
  const marketplaceForecast30d = round(marketplaceRunRate * 30);
  forecasts.push({
    scope: "marketplace",
    refId: "marketplace",
    label: "Marketplace",
    dailyRunRate: marketplaceRunRate,
    expectedUnits7d: round(marketplaceRunRate * 7),
    expectedUnits30d: marketplaceForecast30d,
    trend: marketplaceRunRate > 0 ? "flat" : "declining",
    confidence: Math.min(95, 50 + fabric.totals.unitsSold),
  });

  // Signals: surges, dead demand, category momentum.
  const signals: DemandSignal[] = [];
  for (const product of ranked) {
    if (product.velocityPerDay > 0 && product.daysOfCover !== null && product.daysOfCover < 7) {
      signals.push({
        kind: "opportunity",
        scope: "product",
        refId: product.productId,
        severity: "opportunity",
        title: `Demand surge: ${product.name}`,
        detail: `${product.velocityPerDay}/day with only ${product.daysOfCover}d of cover — demand is outpacing stock.`,
      });
    }
  }
  for (const product of fabric.products) {
    if (product.status === "published" && product.velocityPerDay === 0 && product.available > 0) {
      signals.push({
        kind: "risk",
        scope: "product",
        refId: product.productId,
        severity: "watch",
        title: `No demand: ${product.name}`,
        detail: `Published with ${product.available} in stock but no sales in the last ${fabric.windowDays} days.`,
      });
    }
  }
  const topCategory = fabric.categories[0];
  if (topCategory && topCategory.revenue > 0) {
    signals.push({
      kind: "trend",
      scope: "category",
      refId: topCategory.category,
      severity: "info",
      title: `${topCategory.category} leads demand`,
      detail: `${topCategory.share}% of marketplace revenue across ${topCategory.products} products.`,
    });
  }

  return {
    forecasts,
    signals: signals.slice(0, 40),
    marketplaceRunRate,
    marketplaceForecast30d,
  };
}
