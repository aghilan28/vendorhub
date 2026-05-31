// MCP-0E.7 — Buyer Intelligence Activation.
// Personalized discovery, recommendations, availability and delivery
// predictions computed from real marketplace behaviour (the fabric).

import type { BuyerIntelligence, BuyerRecommendation, MarketplaceFabric, ProductFacts } from "./types";

export interface BuyerContext {
  /** The category the buyer is currently browsing (optional). */
  category?: string;
  /** Products the buyer already has (cart/orders) to exclude from recs. */
  excludeProductIds?: string[];
}

function rec(product: ProductFacts, reason: string, score: number): BuyerRecommendation {
  return { productId: product.productId, name: product.name, reason, score: Math.round(score) };
}

export function buildBuyerIntelligence(fabric: MarketplaceFabric, ctx: BuyerContext = {}): BuyerIntelligence {
  const exclude = new Set(ctx.excludeProductIds ?? []);
  const inStock = fabric.products.filter((p) => p.available > 0 && p.status === "published" && !exclude.has(p.productId));

  const trending = [...inStock]
    .filter((p) => p.velocityPerDay > 0 || p.views > 0)
    .sort((a, b) => b.velocityPerDay * 2 + b.views - (a.velocityPerDay * 2 + a.views))
    .slice(0, 8)
    .map((p) => rec(p, p.velocityPerDay > 0 ? `${p.velocityPerDay}/day right now` : `${p.views} recent views`, 60 + p.velocityPerDay * 4 + Math.min(20, p.views)));

  const recommended = [...inStock]
    .map((p) => ({ p, s: p.rating * 12 + p.conversionPct * 0.5 + p.velocityPerDay * 3 }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 8)
    .map(({ p, s }) => rec(p, p.rating >= 4 ? `Top rated (${p.rating}★)` : "Popular with buyers", s));

  const relatedByCategory: Record<string, BuyerRecommendation[]> = {};
  const categories = ctx.category ? fabric.categories.filter((c) => c.category === ctx.category) : fabric.categories;
  for (const cat of categories.slice(0, 8)) {
    relatedByCategory[cat.category] = inStock
      .filter((p) => p.category === cat.category)
      .sort((a, b) => b.rating - a.rating || b.velocityPerDay - a.velocityPerDay)
      .slice(0, 4)
      .map((p) => rec(p, `In ${cat.category}`, 50 + p.rating * 8));
  }

  const availabilityPredictions = fabric.products
    .filter((p) => p.velocityPerDay > 0 || p.available <= 0)
    .slice(0, 12)
    .map((p) => ({
      productId: p.productId,
      name: p.name,
      daysOfCover: p.daysOfCover,
      prediction:
        p.available <= 0
          ? "Currently unavailable — restock expected"
          : p.daysOfCover !== null && p.daysOfCover < 5
            ? `Selling fast — ~${p.daysOfCover}d of stock left`
            : "In stock and available",
    }));

  const deliveryPredictions = fabric.stores.slice(0, 12).map((store) => ({
    sellerId: store.sellerId,
    name: store.name,
    etaMinutes: Math.max(20, Math.min(180, 30 + Math.round(store.responseMinutes / 3))),
    confidence: store.verified ? 90 : 65,
  }));

  const smartDiscovery: string[] = [];
  const topCat = fabric.categories[0];
  if (topCat) smartDiscovery.push(`Trending category: ${topCat.category}`);
  const topRated = [...inStock].sort((a, b) => b.rating - a.rating)[0];
  if (topRated && topRated.rating >= 4) smartDiscovery.push(`Top rated near you: ${topRated.name} (${topRated.rating}★)`);
  const surge = inStock.find((p) => p.daysOfCover !== null && p.daysOfCover < 5 && p.velocityPerDay > 0);
  if (surge) smartDiscovery.push(`In demand: ${surge.name} — order soon`);

  return { trending, recommended, relatedByCategory, availabilityPredictions, deliveryPredictions, smartDiscovery };
}
