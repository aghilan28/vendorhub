"use client";

import { useQuery } from "@tanstack/react-query";
import { marketplaceProducts } from "@/features/marketplace/lib/data";
import type { AppLocale } from "@/lib/i18n/config";
import { buildRecommendationContext } from "./behavioral-events";
import { getHomepageRecommendations, getRelatedProducts } from "./recommendations";
import { searchMarketplaceProducts } from "./search-ranking";
import type { SearchFilters } from "./types";
import type { MarketplaceSearchResult } from "./types";
import type { BuyerLocation } from "@/types";
import { useIntelligenceStore } from "@/store/intelligence-store";

const delay = async () => new Promise((resolve) => setTimeout(resolve, 45));

export function useSemanticMarketplaceSearch(query: string, filters: SearchFilters, products = marketplaceProducts, buyerLocation?: BuyerLocation | null, locale: AppLocale = "en") {
  const events = useIntelligenceStore((state) => state.events);
  const context = buildRecommendationContext(events, products, buyerLocation?.locality);
  return useQuery({
    queryKey: ["intelligence", "search", locale, query, filters.category, filters.availability, filters.sort, filters.radiusKm, filters.nearbyOnly, buyerLocation?.id, products.length, events.length],
    queryFn: async () => {
      try {
        const response = await fetch("/api/intelligence/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            category: filters.category,
            availability: filters.availability,
            sort: filters.sort,
            radiusKm: filters.radiusKm ?? 6,
            nearbyOnly: Boolean(filters.nearbyOnly),
            latitude: buyerLocation?.latitude,
            longitude: buyerLocation?.longitude,
            locale,
            recentQueries: context.recentQueries ?? [],
            exploredCategories: context.exploredCategorySlugs ?? [],
          }),
        });

        if (!response.ok) throw new Error("Live search request failed.");
        return (await response.json()) as MarketplaceSearchResult;
      } catch {
        await delay();
        return searchMarketplaceProducts(query, products, filters, buyerLocation, locale, context);
      }
    },
    placeholderData: (previous) => previous,
  });
}

export function useRelatedProducts(productId: string, products = marketplaceProducts) {
  const events = useIntelligenceStore((state) => state.events);
  const context = buildRecommendationContext(events, products);
  return useQuery({
    queryKey: ["intelligence", "related", productId, products.length, events.length],
    queryFn: async () => {
      await delay();
      const product = products.find((item) => item.id === productId);
      return product ? getRelatedProducts(product, products, 4, context) : [];
    },
  });
}

export function useHomepageRecommendations(products = marketplaceProducts) {
  const events = useIntelligenceStore((state) => state.events);
  const context = buildRecommendationContext(events, products);
  return useQuery({
    queryKey: ["intelligence", "homepage-recommendations", products.length, events.length],
    queryFn: async () => {
      await delay();
      return getHomepageRecommendations(products, [], 4, context);
    },
  });
}

export function useMarketplaceIntelligence(products = marketplaceProducts) {
  return useQuery({
    queryKey: ["intelligence", "marketplace", products.length],
    queryFn: async () => {
      await delay();
      const { getMarketplaceIntelligence } = await import("./marketplace-insights");
      return getMarketplaceIntelligence(products);
    },
  });
}
