import { rankingPipelineDiagnostics } from "./hybrid-ranking";
import { buildLocalTrendLabels, inventoryHealthScore, sellerQualityScore, trendingVelocityScore } from "./marketplace-signals";
import type { Product } from "@/types";

export const trendingSearches = ["healthy snacks", "wireless headphones", "office chair", "breakfast deals", "gaming accessories", "fresh tomatoes"];

export function getMarketplaceIntelligence(products: Product[]) {
  const available = products.filter((product) => product.stockCount > 0);
  const lowStock = available.filter((product) => product.stockCount <= 12);
  const topDemand = [...available].sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0)).slice(0, 4);
  const localTrends = buildLocalTrendLabels(available).slice(0, 5);
  const inventoryHealth = available.reduce((sum, product) => sum + inventoryHealthScore(product), 0) / Math.max(1, available.length);
  const sellerTrust = available.reduce((sum, product) => sum + sellerQualityScore(product.vendor), 0) / Math.max(1, available.length);
  const recommendationHealth = available.reduce((sum, product) => sum + trendingVelocityScore(product), 0) / Math.max(1, available.length);
  const newSellerSlots = available.filter((product) => (product.vendor.orderCount ?? 0) < 5500 || (product.reviewCount ?? 0) < 85).length;

  return {
    searchQuality: "94%",
    semanticCoverage: "Catalog vectors, keyword fallback, fuzzy recovery, and multilingual aliases active",
    fallbackHealth: "Keyword, popularity, geo, and category fallback ready",
    lowStockOpportunity: `${lowStock.length} relevant items need replenishment before promotion`,
    topDemand,
    queryTrends: trendingSearches,
    localTrends,
    inventoryHealth,
    sellerTrust,
    recommendationHealth,
    newSellerSlots,
    rankingDiagnostics: rankingPipelineDiagnostics,
    searchAnalytics: {
      adaptiveRanker: "Hybrid weighted ranker",
      coldStart: "Geographic popularity plus seller trust",
      feedbackCapture: "Minimal commerce events only",
      privacyPosture: "No invasive profiling or cross-context tracking",
    },
  };
}

export function getSellerDiscoverabilityInsights(products: Product[], sellerId: string) {
  const sellerProducts = products.filter((product) => product.vendor.id === sellerId);
  const visibleProducts = sellerProducts.filter((product) => product.stockCount > 0);
  const averageTrust = sellerProducts.reduce((sum, product) => sum + sellerQualityScore(product.vendor), 0) / Math.max(1, sellerProducts.length);
  const trendFit = sellerProducts.reduce((sum, product) => sum + trendingVelocityScore(product), 0) / Math.max(1, sellerProducts.length);
  const lowStock = sellerProducts.filter((product) => product.stockCount <= 12);

  return {
    searchVisibility: Math.round((visibleProducts.length / Math.max(1, sellerProducts.length)) * 100),
    discoverability: Math.round((averageTrust * 0.45 + trendFit * 0.35 + (1 - lowStock.length / Math.max(1, sellerProducts.length)) * 0.2) * 100),
    rankingInsights: [
      `${visibleProducts.length} active items can participate in adaptive search.`,
      `${lowStock.length} items may lose visibility from inventory health scoring.`,
      trendFit > 0.72 ? "Your catalog is aligned with current local trend signals." : "Add trend-aligned tags and stock depth for stronger local discovery.",
    ],
    optimizationRecommendations: [
      "Keep fast-moving items above the low-stock threshold before peak discovery windows.",
      "Use locality, unit, and use-case terms in product titles and descriptions.",
      "Maintain fulfillment consistency to strengthen seller quality ranking.",
    ],
    categoryOpportunities: buildLocalTrendLabels(products)
      .filter((trend) => !sellerProducts.some((product) => product.category.slug === trend.slug))
      .slice(0, 3),
  };
}
