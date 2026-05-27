import type { Product } from "@/types";
import { searchMarketplaceProducts } from "@/features/intelligence/search-ranking";
import type { SearchFilters } from "@/features/intelligence/types";

export type AiFailureMode =
  | "embedding_corruption"
  | "vector_slowdown"
  | "reranking_outage"
  | "stale_recommendations"
  | "queue_saturation"
  | "semantic_mismatch_flood"
  | "recommendation_replay_storm"
  | "personalization_drift"
  | "ai_cache_corruption"
  | "none";

export function aiRecoveryAction(mode: AiFailureMode) {
  const actions: Record<AiFailureMode, string[]> = {
    embedding_corruption: ["disable vector-only ranking", "refresh affected embeddings", "serve keyword and operational ranking"],
    vector_slowdown: ["lower vector match count", "use cached candidates", "prefer keyword/fuzzy fallback"],
    reranking_outage: ["freeze ranking weights", "use deterministic hybrid scoring", "record replay diagnostics"],
    stale_recommendations: ["shorten recommendation TTL", "increase diversity", "recompute from behavior aggregates"],
    queue_saturation: ["throttle bulk AI jobs", "reserve interactive retrieval capacity", "defer non-critical indexing"],
    semantic_mismatch_flood: ["raise keyword weighting", "lower semantic confidence claims", "replay multilingual normalization diagnostics"],
    recommendation_replay_storm: ["deduplicate replay keys", "pause aggregate writes", "rebuild snapshots from durable telemetry"],
    personalization_drift: ["decay stale affinities", "blend cold-start local demand", "enqueue personalization refresh"],
    ai_cache_corruption: ["bypass AI cache", "invalidate search and recommendation keys", "rebuild cache from deterministic sources"],
    none: ["normal AI commerce operation"],
  };
  return actions[mode];
}

export function degradedMarketplaceSearch(input: { query: string; products: Product[]; filters: SearchFilters }) {
  return searchMarketplaceProducts(input.query, input.products, input.filters, null, "en", { isNewUser: true });
}
