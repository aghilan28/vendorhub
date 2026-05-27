import { NextResponse } from "next/server";
import { z } from "zod";
import { marketplaceProducts } from "@/features/marketplace/lib/data";
import { searchLiveMarketplaceProducts } from "@/lib/ai/commerce-intelligence";
import { env } from "@/lib/env";
import type { AppLocale } from "@/lib/i18n/config";
import { recordOperationalEvent } from "@/lib/production/observability";
import { securityRateLimits } from "@/lib/security/rate-limit";
import { withSecurity } from "@/lib/security/request-guard";

const SearchRequestSchema = z.object({
  query: z.string().default(""),
  category: z.string().default("all"),
  availability: z.enum(["available", "all"]).default("available"),
  sort: z.enum(["intelligent", "nearest", "fastest", "rating", "price-low", "availability"]).default("intelligent"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  radiusKm: z.number().min(1).max(25).default(6),
  nearbyOnly: z.boolean().default(false),
  locale: z.enum(["en", "ta", "hi"]).default("en"),
  recentQueries: z.array(z.string()).default([]),
  exploredCategories: z.array(z.string()).default([]),
  recentlyViewedProductIds: z.array(z.string()).default([]),
  cartProductIds: z.array(z.string()).default([]),
  anonymousId: z.string().max(128).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  if (env.supabaseUrl && env.supabaseAnonKey) {
    try {
      body = await withSecurity(request, { name: "intelligence.search.post", rateLimit: securityRateLimits.aiSearch }, async () => request.json().catch(() => ({})));
    } catch (error) {
      if (process.env.NODE_ENV !== "development") throw error;
      recordOperationalEvent("warn", "ai.search.demo_safe_security_context", { route: "intelligence.search.post" }, { domain: "ai" });
      body = await request.json().catch(() => ({}));
    }
  } else {
    body = await request.json().catch(() => ({}));
    recordOperationalEvent("warn", "ai.search.demo_safe_security_context", { route: "intelligence.search.post" }, { domain: "ai" });
  }

  const parsed = SearchRequestSchema.safeParse(body);
  if (!parsed.success) {
    recordOperationalEvent("warn", "ai.search.validation_failed", { issues: parsed.error.issues.length }, { domain: "ai" });
    return NextResponse.json({ error: "Invalid search request." }, { status: 400 });
  }

  const { query, category, availability, sort, latitude, longitude, radiusKm, nearbyOnly, locale, recentQueries, exploredCategories, recentlyViewedProductIds, cartProductIds, anonymousId } = parsed.data;
  const buyerLocation =
    typeof latitude === "number" && typeof longitude === "number"
      ? { id: "api-location", label: "API location", source: "manual" as const, latitude, longitude, locality: "Requested area", city: "Chennai" }
      : undefined;

  const result = await searchLiveMarketplaceProducts({
    query,
    fallbackProducts: marketplaceProducts,
    filters: { category, availability, sort, radiusKm, nearbyOnly },
    buyerLocation,
    locale: locale as AppLocale,
    context: {
      recentQueries,
      exploredCategorySlugs: exploredCategories,
      recentlyViewedProductIds,
      cartProductIds,
      locationLocality: buyerLocation?.locality,
      isNewUser: recentQueries.length + exploredCategories.length + recentlyViewedProductIds.length + cartProductIds.length < 3,
    },
    behaviorEvents: [
      ...recentQueries.map((recentQuery: string) => ({ type: "search_interaction" as const, query: recentQuery, createdAt: new Date().toISOString() })),
      ...exploredCategories.map((categorySlug: string) => ({ type: "category_explore" as const, categorySlug, createdAt: new Date().toISOString() })),
      ...recentlyViewedProductIds.map((productId: string) => ({ type: "product_click" as const, productId, createdAt: new Date().toISOString() })),
      ...cartProductIds.map((productId: string) => ({ type: "cart_add" as const, productId, createdAt: new Date().toISOString() })),
    ],
    anonymousId,
  });

  return NextResponse.json(result);
}
