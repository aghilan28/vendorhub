import { deliveryFeasibility, geoScoreForVendor } from "@/lib/geo";
import type { AppLocale } from "@/lib/i18n/config";
import type { BuyerLocation, Product } from "@/types";
import { behavioralAffinityScore } from "./behavioral-events";
import { coldStartRankingWeights, defaultHybridRankingWeights, normalizeRankingWeights } from "./ranking-config";
import {
  fairnessExplorationScore,
  freshnessScore,
  fulfillmentReliabilityScore,
  inventoryHealthScore,
  localDemandScore,
  multilingualRelevanceScore,
  popularityScore,
  sellerQualityScore,
  trendingVelocityScore,
} from "./marketplace-signals";
import type { RankedProduct, RankingPipelineDiagnostics, RankingSignalBreakdown, RankingWeights, RecommendationContext } from "./types";

export interface HybridRankingInput {
  product: Product;
  products: Product[];
  query: string;
  semanticScore: number;
  fuzzyScore: number;
  keywordScore: number;
  buyerLocation?: BuyerLocation | null;
  locale?: AppLocale;
  context?: RecommendationContext;
  weights?: Partial<RankingWeights>;
}

export const rankingPipelineDiagnostics: RankingPipelineDiagnostics = {
  retrievalLayer: "Vector, keyword, fuzzy, category, and geo-feasible candidates",
  scoringLayer: "Configurable hybrid factors with fallback-safe defaults",
  postProcessingLayer: "Sort intent, stock guardrails, and explanation enrichment",
  diversityLayer: "Seller balancing and new-item exploration placeholders",
  fallbackLayer: "Keyword, popularity, category, and geo relevance remain available",
};

function mergeWeights(input?: Partial<RankingWeights>, coldStart = false): RankingWeights {
  return normalizeRankingWeights({ ...(coldStart ? coldStartRankingWeights : defaultHybridRankingWeights), ...input });
}

export function scoreHybridRank(input: HybridRankingInput): RankedProduct {
  const coldStart = input.context?.isNewUser || !input.query.trim();
  const weights = mergeWeights(input.weights, coldStart);
  const feasibility = deliveryFeasibility(input.product.vendor, input.buyerLocation);
  const distance = geoScoreForVendor(input.product.vendor, input.buyerLocation);
  const popularity = popularityScore(input.product);
  const freshness = freshnessScore(input.product);
  const sellerQuality = sellerQualityScore(input.product.vendor);
  const inventory = inventoryHealthScore(input.product);
  const fulfillment = fulfillmentReliabilityScore(input.product);
  const behavioral = behavioralAffinityScore(input.product, input.context);
  const multilingual = multilingualRelevanceScore(input.product, input.query);
  const trending = Math.max(trendingVelocityScore(input.product, input.context), localDemandScore(input.product, input.buyerLocation));
  const fairness = fairnessExplorationScore(input.product, input.products);

  const signals: RankingSignalBreakdown = {
    semantic: input.semanticScore,
    keyword: input.keywordScore,
    fuzzy: input.fuzzyScore,
    distance,
    popularity,
    freshness,
    sellerQuality,
    inventoryHealth: inventory,
    fulfillmentReliability: fulfillment,
    behavioral,
    multilingual,
    trendingVelocity: trending,
    fairness,
  };

  const score = Object.entries(signals).reduce((sum, [key, value]) => sum + value * weights[key as keyof RankingWeights], 0);

  return {
    product: input.product,
    score,
    semanticScore: input.semanticScore,
    fuzzyScore: input.fuzzyScore,
    keywordScore: input.keywordScore,
    operationalScore: (sellerQuality + inventory + fulfillment + popularity) / 4,
    distanceScore: distance,
    popularityScore: popularity,
    freshnessScore: freshness,
    sellerQualityScore: sellerQuality,
    inventoryHealthScore: inventory,
    behavioralScore: behavioral,
    multilingualScore: multilingual,
    trendingScore: trending,
    fairnessScore: fairness,
    distanceKm: feasibility.distanceKm,
    geoScore: distance,
    deliveryStatus: feasibility.status,
    reason: explainHybridMatch(input.product, signals, feasibility.distanceKm, input.locale ?? "en", coldStart),
    explanations: explainSignals(signals, coldStart),
    rankSignals: signals,
  };
}

export function applyDiversityBalancing(items: RankedProduct[], limit?: number) {
  const seenSellerCounts = new Map<string, number>();
  const balanced = [...items]
    .sort((a, b) => b.score - a.score)
    .map((item) => {
      const sellerCount = seenSellerCounts.get(item.product.vendor.id) ?? 0;
      seenSellerCounts.set(item.product.vendor.id, sellerCount + 1);
      const diversityPenalty = sellerCount > 1 ? sellerCount * 0.025 : 0;
      const explorationBoost = (item.product.reviewCount ?? 0) < 90 || (item.product.vendor.orderCount ?? 0) < 5500 ? 0.018 : 0;
      return { ...item, score: Math.max(0, item.score - diversityPenalty + explorationBoost) };
    })
    .sort((a, b) => b.score - a.score);

  return typeof limit === "number" ? balanced.slice(0, limit) : balanced;
}

function explainSignals(signals: RankingSignalBreakdown, coldStart: boolean) {
  const ordered = Object.entries(signals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([key]) => key.replace(/[A-Z]/g, (match) => ` ${match.toLowerCase()}`));

  return coldStart ? ["Cold-start blend using local demand, trusted sellers, and useful exploration.", ...ordered] : ordered;
}

function explainHybridMatch(product: Product, signals: RankingSignalBreakdown, distanceKm: number | null, locale: AppLocale, coldStart: boolean) {
  if (coldStart && signals.popularity > 0.72) return "Useful cold-start pick based on nearby demand, seller quality, and available stock.";
  if (typeof distanceKm === "number" && distanceKm < 2.5) return `Nearby match from ${product.vendor.locality}, ${distanceKm.toFixed(1)} km away.`;
  if (signals.behavioral > 0.72) return "Ranked higher because it matches recent discovery intent without using personal profiling.";
  if (signals.sellerQuality > 0.82) return "Trusted seller with reliable fulfillment and strong local operating signals.";
  if (signals.trendingVelocity > 0.78) return "Local demand and time-aware discovery signals are strong right now.";
  if (signals.fairness > 0.72) return "Balanced into discovery to keep new and smaller sellers visible.";
  return locale === "ta" || locale === "hi"
    ? `Adaptive local match for ${product.category.name} with relevance, stock, and seller quality signals.`
    : `Adaptive local match for ${product.category.name.toLowerCase()} with relevance, stock, and seller quality signals.`;
}
