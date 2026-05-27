import type { Product } from "@/types";

export type SearchMode = "semantic" | "hybrid" | "fuzzy" | "keyword";
export type SearchSort = "intelligent" | "nearest" | "fastest" | "rating" | "price-low" | "availability";
export type IntelligenceConfidence = "high" | "medium" | "fallback";
export type RecommendationSource =
  | "semantic_similarity"
  | "category_affinity"
  | "popular_nearby"
  | "basket_context"
  | "session_similarity"
  | "cold_start"
  | "local_trend"
  | "seller_exploration";

export interface SearchFilters {
  category: string;
  availability: "available" | "all";
  sort: SearchSort;
  radiusKm?: number;
  nearbyOnly?: boolean;
}

export interface RankedProduct {
  product: Product;
  score: number;
  semanticScore: number;
  fuzzyScore: number;
  keywordScore: number;
  operationalScore: number;
  distanceScore?: number;
  popularityScore?: number;
  freshnessScore?: number;
  sellerQualityScore?: number;
  inventoryHealthScore?: number;
  behavioralScore?: number;
  multilingualScore?: number;
  trendingScore?: number;
  fairnessScore?: number;
  distanceKm?: number | null;
  geoScore?: number;
  deliveryStatus?: string;
  reason: string;
  explanations?: string[];
  rankSignals?: RankingSignalBreakdown;
}

export interface MarketplaceSearchResult {
  query: string;
  correctedQuery?: string;
  mode: SearchMode;
  latencyMs: number;
  results: RankedProduct[];
  suggestions: string[];
  alternatives: string[];
  intelligence: {
    summary: string;
    confidence: IntelligenceConfidence;
    signals: string[];
    fallbackUsed?: boolean;
    pipeline?: RankingPipelineDiagnostics;
    coldStart?: ColdStartDiagnostics;
  };
}

export interface ProductRecommendation {
  product: Product;
  score: number;
  reason: string;
  source: RecommendationSource;
  explanations?: string[];
  confidence?: IntelligenceConfidence;
}

export interface SellerListingGuidance {
  qualityScore: number;
  titleSuggestions: string[];
  descriptionSuggestions: string[];
  categorySuggestions: string[];
  searchOptimizationHints: string[];
  pricingSignals: string[];
}

export interface RankingWeights {
  semantic: number;
  keyword: number;
  fuzzy: number;
  distance: number;
  popularity: number;
  freshness: number;
  sellerQuality: number;
  inventoryHealth: number;
  fulfillmentReliability: number;
  behavioral: number;
  multilingual: number;
  trendingVelocity: number;
  fairness: number;
}

export interface RankingSignalBreakdown {
  semantic: number;
  keyword: number;
  fuzzy: number;
  distance: number;
  popularity: number;
  freshness: number;
  sellerQuality: number;
  inventoryHealth: number;
  fulfillmentReliability: number;
  behavioral: number;
  multilingual: number;
  trendingVelocity: number;
  fairness: number;
}

export interface RankingPipelineDiagnostics {
  retrievalLayer: string;
  scoringLayer: string;
  postProcessingLayer: string;
  diversityLayer: string;
  fallbackLayer: string;
}

export interface ColdStartDiagnostics {
  active: boolean;
  strategy: string;
  signals: string[];
}

export type BehavioralEventType =
  | "product_click"
  | "category_explore"
  | "search_interaction"
  | "add_to_cart_intent"
  | "recommendation_interaction";

export interface BehavioralCommerceEvent {
  type: BehavioralEventType;
  productId?: string;
  categorySlug?: string;
  query?: string;
  source?: string;
  createdAt: string;
}

export interface RecommendationContext {
  recentlyViewedProductIds?: string[];
  exploredCategorySlugs?: string[];
  recentQueries?: string[];
  cartProductIds?: string[];
  locationLocality?: string;
  isNewUser?: boolean;
}
