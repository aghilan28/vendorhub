import { BuyerLocation } from "@/types";

export interface RankingContext {
  buyerLocation: BuyerLocation;
  radiusKm: number;
}

export interface StoreRankingResult {
  storeId: string;
  rank: number;
  score: number;
  distanceScore: number;
  availabilityScore: number;
  qualityScore: number;
  explanation: string;
  confidence: number;
}

export interface StoreSelection {
  recommendedStoreId: string;
  alternatives: string[];
  fallbacks: string[];
  selectionReason: string;
}
