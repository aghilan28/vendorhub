// MCP-1D Phase 8 — Marketplace Recommendation System (deterministic, pure).
//
// Recommended / trending / nearby / similar products & stores, cross-sell,
// up-sell, recently viewed and continue-shopping, blended with a customer's
// personalization affinities. Produces a ranked, de-duplicated set + coverage.

import type {
  AffinityScore,
  RecommendationItem,
  RecommendationKind,
  RecommendationSet,
} from "./types";

export interface ProductCandidate {
  id: string;
  title: string;
  category?: string;
  brand?: string;
  storeId?: string;
  price?: number;
  rating?: number; // 0..5
  popularity?: number; // 0..100
  trending?: boolean;
  distanceKm?: number | null;
}

export interface StoreCandidate {
  id: string;
  name: string;
  rating?: number;
  popularity?: number;
  trending?: boolean;
  distanceKm?: number | null;
}

export interface RecommendationContext {
  customerId: string;
  categoryAffinity?: AffinityScore[];
  recentlyViewed?: ProductCandidate[];
  cartCategories?: string[]; // for cross/up-sell
  abandonedCart?: ProductCandidate[];
}

const ALL_KINDS: RecommendationKind[] = [
  "recommended_product",
  "recommended_store",
  "trending_product",
  "trending_store",
  "nearby",
  "similar",
  "cross_sell",
  "up_sell",
  "recently_viewed",
  "continue_shopping",
];

function affinityFor(category: string | undefined, affinity: AffinityScore[] | undefined): number {
  if (!category || !affinity) return 0;
  return affinity.find((a) => a.key === category || a.label === category)?.score ?? 0;
}

function productScore(p: ProductCandidate, affinity?: AffinityScore[]): number {
  const ratingScore = (p.rating ?? 0) * 20; // 0..100
  const popularity = p.popularity ?? 0;
  const aff = affinityFor(p.category, affinity);
  return Math.round(ratingScore * 0.3 + popularity * 0.3 + aff * 0.4);
}

function item(kind: RecommendationKind, refId: string, title: string, reason: string, score: number, extra?: Partial<RecommendationItem>): RecommendationItem {
  return { id: `rec-${kind}-${refId}`, kind, refId, title, reason, score: Math.max(0, Math.min(100, score)), ...extra };
}

export function buildRecommendations(products: ProductCandidate[], stores: StoreCandidate[], ctx: RecommendationContext): RecommendationSet {
  const items: RecommendationItem[] = [];
  const affinity = ctx.categoryAffinity;

  // Recommended products (affinity-blended)
  for (const p of [...products].sort((a, b) => productScore(b, affinity) - productScore(a, affinity)).slice(0, 6)) {
    items.push(item("recommended_product", p.id, p.title, p.category ? `Matches your interest in ${p.category}` : "Picked for you", productScore(p, affinity), { price: p.price, category: p.category }));
  }
  // Trending products
  for (const p of products.filter((p) => p.trending).slice(0, 4)) {
    items.push(item("trending_product", p.id, p.title, "Trending in the marketplace", Math.max(60, p.popularity ?? 60), { price: p.price, category: p.category }));
  }
  // Recommended + trending stores
  for (const s of [...stores].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)).slice(0, 3)) {
    items.push(item("recommended_store", s.id, s.name, "Highly rated store for you", Math.round((s.rating ?? 0) * 20 * 0.5 + (s.popularity ?? 0) * 0.5)));
  }
  for (const s of stores.filter((s) => s.trending).slice(0, 2)) {
    items.push(item("trending_store", s.id, s.name, "Trending store nearby", Math.max(60, s.popularity ?? 60)));
  }
  // Nearby (distance-sorted)
  for (const p of products.filter((p) => p.distanceKm != null).sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0)).slice(0, 3)) {
    items.push(item("nearby", p.id, p.title, `${(p.distanceKm ?? 0).toFixed(1)} km away — fast delivery`, 70, { price: p.price, category: p.category }));
  }
  // Similar (same category as top recently-viewed)
  const seedCategory = ctx.recentlyViewed?.[0]?.category;
  if (seedCategory) {
    for (const p of products.filter((p) => p.category === seedCategory).slice(0, 3)) {
      items.push(item("similar", p.id, p.title, `Similar to what you viewed in ${seedCategory}`, productScore(p, affinity)));
    }
  }
  // Cross-sell / up-sell from cart categories
  for (const cat of ctx.cartCategories ?? []) {
    const cross = products.find((p) => p.category && p.category !== cat);
    if (cross) items.push(item("cross_sell", cross.id, cross.title, `Goes well with your ${cat} items`, 64, { price: cross.price, category: cross.category }));
    const up = products.filter((p) => p.category === cat).sort((a, b) => (b.price ?? 0) - (a.price ?? 0))[0];
    if (up) items.push(item("up_sell", up.id, up.title, `A premium ${cat} pick`, 62, { price: up.price, category: up.category }));
  }
  // Recently viewed + continue shopping
  for (const p of (ctx.recentlyViewed ?? []).slice(0, 4)) {
    items.push(item("recently_viewed", p.id, p.title, "You viewed this recently", 55, { price: p.price, category: p.category }));
  }
  for (const p of (ctx.abandonedCart ?? []).slice(0, 3)) {
    items.push(item("continue_shopping", p.id, p.title, "Still in your cart — complete your purchase", 75, { price: p.price, category: p.category }));
  }

  // De-duplicate by id, keep highest score; then sort.
  const best = new Map<string, RecommendationItem>();
  for (const it of items) {
    const prev = best.get(it.id);
    if (!prev || it.score > prev.score) best.set(it.id, it);
  }
  const deduped = [...best.values()].sort((a, b) => b.score - a.score);

  const byKind: Record<string, number> = {};
  for (const it of deduped) byKind[it.kind] = (byKind[it.kind] ?? 0) + 1;
  const coverage = Math.round((Object.keys(byKind).length / ALL_KINDS.length) * 100);

  return { customerId: ctx.customerId, items: deduped, byKind, coverage };
}
