import type { RankingWeights } from "./types";

export const defaultHybridRankingWeights: RankingWeights = {
  semantic: 0.18,
  keyword: 0.11,
  fuzzy: 0.08,
  distance: 0.12,
  popularity: 0.1,
  freshness: 0.07,
  sellerQuality: 0.11,
  inventoryHealth: 0.08,
  fulfillmentReliability: 0.05,
  behavioral: 0.05,
  multilingual: 0.03,
  trendingVelocity: 0.04,
  fairness: 0.03,
};

export const coldStartRankingWeights: RankingWeights = {
  ...defaultHybridRankingWeights,
  semantic: 0.14,
  keyword: 0.09,
  distance: 0.15,
  popularity: 0.15,
  sellerQuality: 0.14,
  inventoryHealth: 0.08,
  behavioral: 0.02,
  trendingVelocity: 0.06,
  fairness: 0.06,
};

export function normalizeRankingWeights(weights: RankingWeights): RankingWeights {
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0) || 1;
  return Object.fromEntries(Object.entries(weights).map(([key, value]) => [key, value / total])) as unknown as RankingWeights;
}
