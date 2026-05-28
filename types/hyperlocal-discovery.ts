import type { BuyerLocation, Product } from "@/types";

export type DiscoveryLanguage = "en" | "ta" | "te" | "kn" | "ml" | "hi" | "romanized";

export type DiscoveryIntent =
  | "exact"
  | "recipe"
  | "festival"
  | "time_window"
  | "weather"
  | "hostel"
  | "health"
  | "pooja"
  | "freshness"
  | "seller"
  | "generic";

export interface CommerceSearchTokens {
  search_tokens: string[];
  phonetic_tokens: string[];
  fuzzy_tokens: string[];
  transliteration_tokens: string[];
  voice_tokens: string[];
  recipe_tokens: string[];
  festival_tokens: string[];
  context_tokens: string[];
}

export interface LocalizedCommerceNames {
  localized_names: Partial<Record<DiscoveryLanguage, string>>;
  regional_aliases: string[];
  slang_aliases: string[];
  phonetic_aliases: string[];
  transliterated_aliases: string[];
}

export interface DiscoveryProductDocument {
  product: Product;
  tokens: CommerceSearchTokens;
  localization: LocalizedCommerceNames;
  intentTags: DiscoveryIntent[];
  contextualTags: string[];
  behavioralTags: string[];
  emotionalTags: string[];
  localityEmbeddings: string[];
  semanticEmbeddingId: string;
  vectorIndexKey: string;
  perishability: {
    class: "ambient" | "fresh" | "highly_perishable" | "cold_chain";
    freshnessWindowHours: number;
    coldChainRequired: boolean;
  };
}

export interface DiscoveryContext {
  buyerLocation?: BuyerLocation | null;
  now?: Date;
  weather?: "rainy" | "hot" | "normal";
  festival?: "pongal" | "diwali" | "onam" | "ramadan" | "none";
  language?: DiscoveryLanguage;
  cartProductIds?: string[];
  recentQueries?: string[];
}

export interface QueryUnderstanding {
  originalQuery: string;
  normalizedQuery: string;
  languages: DiscoveryLanguage[];
  intents: DiscoveryIntent[];
  canonicalTerms: string[];
  expandedTerms: string[];
  aliasGroups: string[];
  fuzzyTerms: string[];
  phoneticTerms: string[];
  voiceLike: boolean;
  localityHints: string[];
  recipeHints: string[];
  festivalHints: string[];
}

export interface HyperlocalRankedProduct {
  product: Product;
  score: number;
  matchedTerms: string[];
  rankSignals: {
    text: number;
    alias: number;
    intent: number;
    locality: number;
    time: number;
    festival: number;
    perishability: number;
    seller: number;
    basket: number;
    freshness: number;
    vectorReadiness: number;
  };
  reason: string;
}

export interface HyperlocalSearchResult {
  query: QueryUnderstanding;
  results: HyperlocalRankedProduct[];
  autocomplete: string[];
  recommendations: {
    frequentlyBoughtTogether: Product[];
    recipeBased: Product[];
    localityBased: Product[];
    timeBased: Product[];
    festivalBased: Product[];
    sellerBased: Product[];
  };
  analytics: SearchLearningSnapshot;
}

export interface SearchLearningSnapshot {
  query: string;
  resultCount: number;
  failed: boolean;
  voiceLike: boolean;
  slangDetected: boolean;
  multilingual: boolean;
  missingProductCandidates: string[];
  aliasSuggestions: Array<{ term: string; suggestedCanonical: string; confidence: number }>;
  heatmapKey: string;
}
