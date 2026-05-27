import type { BuyerLocation, Product, Vendor } from "@/types";
import type { RecommendationContext } from "./types";

function stableHash(value: string) {
  return [...value].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 9973, 17);
}

export function bounded(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function sellerQualityScore(vendor: Vendor) {
  const verification = vendor.verified ? 0.18 : 0.06;
  const rating = bounded(vendor.rating / 5) * 0.34;
  const orderDepth = bounded((vendor.orderCount ?? 0) / 12000) * 0.22;
  const fulfillmentConsistency = vendor.serviceStatus === "open" ? 0.16 : vendor.serviceStatus === "busy" ? 0.1 : 0.03;
  const responseConsistencyPlaceholder = vendor.fulfillmentPromiseMinutes <= 30 ? 0.1 : vendor.fulfillmentPromiseMinutes <= 45 ? 0.07 : 0.04;
  return bounded(verification + rating + orderDepth + fulfillmentConsistency + responseConsistencyPlaceholder);
}

export function inventoryHealthScore(product: Product) {
  if (product.stockCount <= 0) return 0.03;
  if (product.stockCount <= 6) return 0.42;
  if (product.stockCount <= 15) return 0.74;
  return 0.92;
}

export function popularityScore(product: Product) {
  const reviews = bounded((product.reviewCount ?? 0) / 260) * 0.55;
  const sellerOrders = bounded((product.vendor.orderCount ?? 0) / 14000) * 0.3;
  const rating = bounded(product.rating / 5) * 0.15;
  return bounded(reviews + sellerOrders + rating);
}

export function freshnessScore(product: Product) {
  const text = [product.name, product.description, ...(product.tags ?? []), ...(product.trustSignals ?? [])].join(" ").toLowerCase();
  if (text.includes("baked today") || text.includes("fresh") || text.includes("batch")) return 0.92;
  if (text.includes("same-day") || text.includes("packed") || text.includes("ready")) return 0.78;
  return 0.55 + (stableHash(product.id) % 25) / 100;
}

export function fulfillmentReliabilityScore(product: Product) {
  const delivery = product.deliveryMinutes ? bounded(1 - product.deliveryMinutes / 75, 0.2, 0.95) : 0.42;
  const vendor = product.vendor.serviceStatus === "open" ? 0.95 : product.vendor.serviceStatus === "busy" ? 0.7 : 0.35;
  return bounded(delivery * 0.62 + vendor * 0.38);
}

export function trendingVelocityScore(product: Product, context?: RecommendationContext) {
  const categoryTrend = context?.exploredCategorySlugs?.includes(product.category.slug) ? 0.18 : 0;
  const localTrend = ["bakery-breakfast", "ready-meals", "fresh-produce"].includes(product.category.slug) ? 0.18 : 0.08;
  const reviewVelocityPlaceholder = bounded((product.reviewCount ?? 0) / 220) * 0.36;
  const timeOfDay = new Date().getHours();
  const timeAware =
    timeOfDay < 11 && ["bakery-breakfast", "fresh-produce"].includes(product.category.slug)
      ? 0.18
      : timeOfDay >= 17 && ["ready-meals", "home-essentials"].includes(product.category.slug)
        ? 0.18
        : 0.08;
  return bounded(0.2 + categoryTrend + localTrend + reviewVelocityPlaceholder + timeAware);
}

export function multilingualRelevanceScore(product: Product, query: string) {
  if (!query.trim()) return 0.55;
  const hasLatin = /[a-z]/i.test(query);
  const hasIndicOrMojibake = /[^\u0000-\u007f]/.test(query);
  const aliases = [product.name, product.category.name, ...(product.tags ?? [])].join(" ").toLowerCase();
  const direct = query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .some((token) => aliases.includes(token));
  return bounded((direct ? 0.35 : 0.12) + (hasLatin && hasIndicOrMojibake ? 0.38 : hasIndicOrMojibake ? 0.28 : 0.18) + 0.24);
}

export function fairnessExplorationScore(product: Product, products: Product[]) {
  const sameSellerCount = products.filter((item) => item.vendor.id === product.vendor.id).length;
  const sellerDepthPenalty = bounded(sameSellerCount / Math.max(1, products.length), 0, 0.35);
  const newSellerExploration = (product.vendor.orderCount ?? 0) < 5500 ? 0.26 : 0.1;
  const newProductExploration = (product.reviewCount ?? 0) < 85 ? 0.2 : 0.06;
  return bounded(0.48 + newSellerExploration + newProductExploration - sellerDepthPenalty);
}

export function localDemandScore(product: Product, buyerLocation?: BuyerLocation | null) {
  const sameCity = buyerLocation?.city && buyerLocation.city === product.vendor.city ? 0.2 : 0.08;
  const sameLocality = buyerLocation?.locality && buyerLocation.locality === product.vendor.locality ? 0.25 : 0;
  const categoryBase = ["fresh-produce", "bakery-breakfast", "ready-meals", "personal-care"].includes(product.category.slug) ? 0.25 : 0.15;
  return bounded(0.22 + sameCity + sameLocality + categoryBase + bounded((product.reviewCount ?? 0) / 500) * 0.18);
}

export function buildLocalTrendLabels(products: Product[]) {
  const categories = new Map<string, { label: string; demand: number; count: number }>();
  products.forEach((product) => {
    const existing = categories.get(product.category.slug) ?? { label: product.category.name, demand: 0, count: 0 };
    categories.set(product.category.slug, {
      label: existing.label,
      demand: existing.demand + (product.reviewCount ?? 0) + product.stockCount * 1.4,
      count: existing.count + 1,
    });
  });

  return [...categories.entries()]
    .map(([slug, item]) => ({ slug, label: item.label, score: Math.round(item.demand / Math.max(1, item.count)) }))
    .sort((a, b) => b.score - a.score);
}
