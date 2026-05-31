import type { SellerNetworkEngine } from "./engine";

export interface SellerAnalyticsHook {
  key: string;
  label: string;
  granularity: "SELLER" | "STORE" | "REGION" | "CITY";
  consumes: string[];
}

/** Declarative analytics hooks (Phase 8). No analysis performed here. */
export const SELLER_ANALYTICS_HOOKS: SellerAnalyticsHook[] = [
  { key: "seller_performance", label: "Seller Performance", granularity: "SELLER", consumes: ["orders", "stores"] },
  { key: "store_performance", label: "Store Performance", granularity: "STORE", consumes: ["orders", "inventory"] },
  { key: "growth_analytics", label: "Growth Analytics", granularity: "SELLER", consumes: ["orders", "stores"] },
  { key: "coverage_analytics", label: "Coverage Analytics", granularity: "REGION", consumes: ["stores", "regions"] },
  { key: "store_density", label: "Store Density", granularity: "CITY", consumes: ["stores", "geo"] },
  { key: "marketplace_expansion", label: "Marketplace Expansion", granularity: "REGION", consumes: ["stores", "sellers"] },
  { key: "regional_penetration", label: "Regional Penetration", granularity: "REGION", consumes: ["stores", "population"] },
];

export interface SellerAnalyticsProjection {
  hooks: SellerAnalyticsHook[];
  totalSellers: number;
  totalStores: number;
  averageStoresPerSeller: number;
  storesByRegion: Record<string, number>;
  storesByType: Record<string, number>;
  storeDensityByCity: { city: string; stores: number }[];
  topChainsByStoreCount: { chainId: string; stores: number }[];
}

/** Builds deterministic analytics rollups for seller/store performance, coverage and density. */
export function buildSellerAnalytics(engine: SellerNetworkEngine): SellerAnalyticsProjection {
  const stats = engine.stats();
  const cityCounts = new Map<string, number>();
  const chainCounts = new Map<string, number>();
  for (const store of engine.stores()) {
    cityCounts.set(store.location.city, (cityCounts.get(store.location.city) ?? 0) + 1);
    const seller = engine.getSeller(store.sellerId);
    const chainId = seller?.parentChainId ?? store.sellerId;
    chainCounts.set(chainId, (chainCounts.get(chainId) ?? 0) + 1);
  }
  return {
    hooks: SELLER_ANALYTICS_HOOKS,
    totalSellers: stats.sellers,
    totalStores: stats.stores,
    averageStoresPerSeller: stats.averageStoresPerSeller,
    storesByRegion: stats.storesByRegion,
    storesByType: stats.storesByType,
    storeDensityByCity: Array.from(cityCounts.entries())
      .map(([city, stores]) => ({ city, stores }))
      .sort((a, b) => b.stores - a.stores || (a.city < b.city ? -1 : 1))
      .slice(0, 25),
    topChainsByStoreCount: Array.from(chainCounts.entries())
      .map(([chainId, stores]) => ({ chainId, stores }))
      .sort((a, b) => b.stores - a.stores || (a.chainId < b.chainId ? -1 : 1))
      .slice(0, 25),
  };
}
