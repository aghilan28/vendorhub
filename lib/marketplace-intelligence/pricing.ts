// MCP-0E.5 — Pricing Intelligence Engine.
// Operates on the fabric (price/margin/discount/velocity/inventory/promotions)
// to produce price optimization, revenue/margin impact and promotion guidance.

import type { MarketplaceFabric, PricingIntelligence, PricingSignal, ProductFacts } from "./types";

const THIN_MARGIN_PCT = 10;

function round(value: number, dp = 0) {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

function recommend(product: ProductFacts): Pick<PricingSignal, "recommendation" | "expectedRevenueImpactPct" | "expectedMarginImpactPct" | "rationale"> {
  // Selling at or below cost — restore margin first.
  if (product.marginPct < 0) {
    return {
      recommendation: "raise",
      expectedRevenueImpactPct: -2,
      expectedMarginImpactPct: Math.min(20, Math.abs(product.marginPct) + 5),
      rationale: `Margin is ${product.marginPct}% (below cost). Raise price to restore profitability.`,
    };
  }
  // Strong demand + healthy margin + little discount → pricing headroom.
  if (product.velocityPerDay > 0 && product.discountPct < 5 && product.marginPct >= 25 && (product.daysOfCover ?? 99) < 30) {
    return {
      recommendation: "raise",
      expectedRevenueImpactPct: 3,
      expectedMarginImpactPct: 5,
      rationale: `Selling at ${product.velocityPerDay}/day with ${product.marginPct}% margin and no discount — pricing headroom.`,
    };
  }
  // No demand but in stock → stimulate with a promotion.
  if (product.velocityPerDay === 0 && product.available > 0 && product.status === "published") {
    return {
      recommendation: "promote",
      expectedRevenueImpactPct: 8,
      expectedMarginImpactPct: -4,
      rationale: "No recent sales — a targeted promotion can stimulate demand.",
    };
  }
  // Overstock (lots of cover) → discount to clear.
  if (product.daysOfCover !== null && product.daysOfCover >= 60) {
    return {
      recommendation: "discount",
      expectedRevenueImpactPct: 6,
      expectedMarginImpactPct: -3,
      rationale: `${product.daysOfCover}d of cover — a discount clears working capital.`,
    };
  }
  return { recommendation: "hold", expectedRevenueImpactPct: 0, expectedMarginImpactPct: 0, rationale: "Price is well-positioned." };
}

export function analyzePricing(fabric: MarketplaceFabric): PricingIntelligence {
  const signals: PricingSignal[] = [];
  for (const product of fabric.products) {
    const rec = recommend(product);
    if (rec.recommendation !== "hold") {
      signals.push({
        productId: product.productId,
        name: product.name,
        sellerId: product.sellerId,
        price: product.price,
        marginPct: product.marginPct,
        ...rec,
      });
    }
  }
  signals.sort((a, b) => Math.abs(b.expectedMarginImpactPct) + Math.abs(b.expectedRevenueImpactPct) - (Math.abs(a.expectedMarginImpactPct) + Math.abs(a.expectedRevenueImpactPct)));

  const margins = fabric.products.filter((p) => p.price > 0);
  const averageMarginPct = margins.length ? round(margins.reduce((s, p) => s + p.marginPct, 0) / margins.length) : 0;
  const belowMarginCount = fabric.products.filter((p) => p.marginPct < THIN_MARGIN_PCT).length;

  const promotionGuidance: string[] = [];
  const slow = fabric.products.filter((p) => p.velocityPerDay === 0 && p.available > 0).length;
  if (slow > 0) promotionGuidance.push(`${slow} slow movers in stock — run targeted coupons to convert dormant inventory.`);
  const overstockCats = fabric.categories.filter((c) => c.unitsSold === 0 && c.products > 0);
  if (overstockCats.length) promotionGuidance.push(`Categories with no sales (${overstockCats.map((c) => c.category).join(", ")}) need promotion or delisting.`);
  if (belowMarginCount > 0) promotionGuidance.push(`${belowMarginCount} products priced below a healthy margin — review before discounting further.`);
  const activePromos = (fabric.totals.unitsSold > 0 ? fabric.categories[0]?.category : null) ?? null;
  if (activePromos && promotionGuidance.length === 0) promotionGuidance.push(`Concentrate promotions on ${activePromos} where conversion is strongest.`);

  return { signals, averageMarginPct, belowMarginCount, promotionGuidance };
}
