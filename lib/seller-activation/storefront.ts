// MCP-1A Phase 8 — Storefront Generation engine (deterministic, pure).
//
// Generates a professional public storefront model from a seller + their
// products: branding, profile, ratings, policies, catalog, trust indicators and
// performance metrics.

import type { Storefront, StorefrontMetrics, StorefrontPolicies, StorefrontProduct } from "./types";

export interface StorefrontSellerInput {
  sellerId: string;
  name: string;
  slug: string;
  tagline?: string;
  logoUrl?: string;
  bannerUrl?: string;
  verified?: boolean;
  rating?: number;
  reviewCount?: number;
  trustScore?: number;
  returnsAccepted?: boolean;
  fulfillmentModel?: "self" | "marketplace" | "hybrid";
}

export interface StorefrontProductInput {
  id: string;
  name: string;
  slug: string;
  price: number;
  imageUrl?: string;
  category: string;
  stock?: number;
}

export interface StorefrontActivityInput {
  fulfillmentRate?: number;
  onTimeRate?: number;
  responseHours?: number;
  cancellationRate?: number;
}

const DEFAULT_POLICIES: StorefrontPolicies = {
  returns: "7-day returns on eligible items.",
  shipping: "Dispatched within 24–48 hours.",
  cancellation: "Free cancellation before dispatch.",
};

function clampRate(value: number | undefined, fallback: number): number {
  if (value === undefined || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function buildStorefront(
  seller: StorefrontSellerInput,
  products: StorefrontProductInput[],
  activity: StorefrontActivityInput = {},
): Storefront {
  const storefrontProducts: StorefrontProduct[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    imageUrl: p.imageUrl,
    category: p.category,
    inStock: (p.stock ?? 0) > 0,
  }));

  const categories = [...new Set(products.map((p) => p.category))].sort();

  const metrics: StorefrontMetrics = {
    fulfillmentRate: clampRate(activity.fulfillmentRate, 96),
    onTimeRate: clampRate(activity.onTimeRate, 92),
    responseHours: Math.max(0, Math.round(activity.responseHours ?? 6)),
    cancellationRate: clampRate(activity.cancellationRate, 3),
  };

  const policies: StorefrontPolicies = {
    ...DEFAULT_POLICIES,
    returns: seller.returnsAccepted === false ? "Returns not accepted on this store." : DEFAULT_POLICIES.returns,
  };

  return {
    sellerId: seller.sellerId,
    slug: seller.slug,
    name: seller.name,
    tagline: seller.tagline ?? "Quality products, trusted service.",
    logoUrl: seller.logoUrl,
    bannerUrl: seller.bannerUrl,
    verified: seller.verified ?? false,
    rating: Math.max(0, Math.min(5, Number((seller.rating ?? 0).toFixed(1)))),
    reviewCount: Math.max(0, seller.reviewCount ?? 0),
    trustScore: clampRate(seller.trustScore, 0),
    productCount: storefrontProducts.length,
    categories,
    policies,
    products: storefrontProducts,
    metrics,
  };
}

/** Trust indicators surfaced on the storefront (badges). */
export function storefrontTrustIndicators(store: Storefront): string[] {
  const indicators: string[] = [];
  if (store.verified) indicators.push("Verified seller");
  if (store.trustScore >= 80) indicators.push("Top-rated trust");
  if (store.metrics.onTimeRate >= 95) indicators.push("Fast & on-time");
  if (store.metrics.fulfillmentRate >= 97) indicators.push("Reliable fulfilment");
  if (store.reviewCount >= 100) indicators.push("100+ reviews");
  return indicators;
}
