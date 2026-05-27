import type { BehavioralCommerceEvent, RecommendationContext } from "./types";
import type { Product } from "@/types";

const MAX_EVENTS = 40;

export function compactBehavioralEvents(events: BehavioralCommerceEvent[]) {
  return events.slice(-MAX_EVENTS);
}

export function buildRecommendationContext(events: BehavioralCommerceEvent[], products: Product[], locationLocality?: string): RecommendationContext {
  const recentEvents = compactBehavioralEvents(events);
  const recentlyViewedProductIds = recentEvents.filter((event) => event.type === "product_click" && event.productId).map((event) => event.productId as string);
  const exploredCategorySlugs = recentEvents.filter((event) => event.categorySlug).map((event) => event.categorySlug as string);
  const recentQueries = recentEvents.filter((event) => event.query).map((event) => event.query as string);
  const categoryFromProducts = recentlyViewedProductIds
    .map((id) => products.find((product) => product.id === id)?.category.slug)
    .filter((slug): slug is string => Boolean(slug));

  return {
    recentlyViewedProductIds: [...new Set(recentlyViewedProductIds)].slice(-8),
    exploredCategorySlugs: [...new Set([...exploredCategorySlugs, ...categoryFromProducts])].slice(-8),
    recentQueries: [...new Set(recentQueries)].slice(-6),
    locationLocality,
    isNewUser: recentEvents.length < 3,
  };
}

export function behavioralAffinityScore(product: Product, context?: RecommendationContext) {
  if (!context) return 0.35;
  const viewed = context.recentlyViewedProductIds ?? [];
  const categories = context.exploredCategorySlugs ?? [];
  const queries = (context.recentQueries ?? []).join(" ").toLowerCase();
  const productText = [product.name, product.category.name, product.description, ...(product.tags ?? [])].join(" ").toLowerCase();
  const categoryAffinity = categories.includes(product.category.slug) ? 0.35 : 0;
  const queryAffinity = queries ? Math.min(0.3, queries.split(/\s+/).filter((token) => productText.includes(token)).length * 0.08) : 0;
  const novelty = viewed.includes(product.id) ? 0.05 : 0.22;
  const locality = context.locationLocality && product.vendor.locality === context.locationLocality ? 0.13 : 0;

  return Math.min(1, 0.25 + categoryAffinity + queryAffinity + novelty + locality);
}
