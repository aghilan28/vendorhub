import { createCommerceEmbedding } from "@/lib/ai/openai-embeddings";
import { vectorToSqlLiteral } from "@/lib/ai/vector";
import { buildPersonalizationProfile, type CommerceBehaviorEvent } from "@/lib/ai/personalization";
import { rankCommerceCandidates } from "@/lib/ai/ranking-intelligence";
import { buildSemanticDiscoveryPlan } from "@/lib/ai/semantic-discovery";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { searchMarketplaceProducts } from "@/features/intelligence/search-ranking";
import type { MarketplaceSearchResult, RecommendationContext, SearchFilters } from "@/features/intelligence/types";
import type { AppLocale } from "@/lib/i18n/config";
import type { BuyerLocation, Product } from "@/types";
import { mapProductRowToProduct, type ProductListRow } from "@/lib/api/mappers/products";
import type { Json, Tables } from "@/types/database";
import { recordOperationalEvent, withTrace } from "@/lib/production/observability";
import { performanceBudgets } from "@/lib/performance/cache-policy";
import { stableCacheKey, withRequestCache } from "@/lib/performance/request-cache";
import { env } from "@/lib/env";
import { expandQuery } from "@/lib/i18n/transliteration";

type HybridRpcRow = {
  id: string;
  semantic_score: number;
  fuzzy_score: number;
  keyword_score: number;
  operational_score: number;
  hybrid_score: number;
};

type ProductHydrationRow = ProductListRow & {
  embedding_text?: string | null;
  embedding_model?: string | null;
  embedding_updated_at?: string | null;
  search_quality_score?: number | null;
};

type RecommendationRow = {
  id: string;
  similarity: number;
  reason: string;
};

function byId<T extends { id: string }>(items: T[]) {
  return new Map(items.map((item) => [item.id, item]));
}

function uuidOrNull(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null;
}

function embeddingFreshnessLabel(row: ProductHydrationRow) {
  if (!row.embedding_updated_at) return "embedding missing";
  const ageHours = (Date.now() - new Date(row.embedding_updated_at).getTime()) / 3_600_000;
  if (ageHours > 72) return "embedding stale";
  if (ageHours > 24) return "embedding aging";
  return "embedding fresh";
}

async function hydrateProducts(ids: string[]) {
  if (!ids.length) return [];
  const orderedIds = [...new Set(ids)];
  return withRequestCache(stableCacheKey(["ai-hydrate-products", orderedIds]), { ttlMs: 45_000, maxEntries: 200 }, async () => hydrateProductsUncached(orderedIds));
}

async function hydrateProductsUncached(ids: string[]) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `
        *,
        vendor:vendors(*),
        category:categories(*),
        images:product_images(*),
        inventory(*),
        reviews(id, rating, title, body, created_at)
      `,
    )
    .in("id", ids)
    .eq("status", "ACTIVE")
    .is("deleted_at", null);

  if (error) throw error;
  return ((data ?? []) as unknown as ProductHydrationRow[]).map((row) => ({
    product: mapProductRowToProduct(row),
    diagnostics: {
      embeddingFreshness: embeddingFreshnessLabel(row),
      embeddingModel: row.embedding_model ?? "unindexed",
      searchQualityScore: row.search_quality_score ?? 0,
    },
  }));
}

function asJsonRecord(metadata: Record<string, unknown>): Json {
  return Object.fromEntries(
    Object.entries(metadata).filter((entry): entry is [string, string | number | boolean | null] => {
      const value = entry[1];
      return value === null || ["string", "number", "boolean"].includes(typeof value);
    }),
  );
}

async function recordSearchEvent(result: MarketplaceSearchResult, metadata: Record<string, unknown>) {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    recordOperationalEvent("warn", "ai.search_event.skipped_missing_supabase", { mode: result.mode, resultCount: result.results.length }, { domain: "ai" });
    return;
  }

  const eventMetadata = asJsonRecord(metadata);
  try {
    const supabase = await createSupabaseServerClient();
    await Promise.all([
      supabase.rpc("record_live_search_event", {
        query_text: result.query,
        corrected_query_text: result.correctedQuery ?? null,
        search_mode: result.mode,
        result_count: result.results.length,
        latency_ms: result.latencyMs,
        fallback_used: Boolean(result.intelligence.fallbackUsed),
        event_metadata: eventMetadata,
      }),
      supabase.rpc("record_ai_retrieval_event", {
        event_type: "marketplace_search",
        query_text: result.query,
        query_locale: typeof metadata.locale === "string" ? metadata.locale : "en",
        retrieval_mode: result.mode,
        candidate_count: typeof metadata.vectorCandidates === "number" ? metadata.vectorCandidates : result.results.length,
        result_count: result.results.length,
        latency_ms: result.latencyMs,
        fallback_used: Boolean(result.intelligence.fallbackUsed),
        event_metadata: eventMetadata,
      }),
    ]);
  } catch {
    recordOperationalEvent("warn", "ai.search_event.record_failed", { mode: result.mode, resultCount: result.results.length }, { domain: "ai" });
  }
}

async function createCachedCommerceEmbedding(query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase() || "popular nearby marketplace products";
  return withRequestCache(stableCacheKey(["commerce-embedding", normalizedQuery]), { ttlMs: 10 * 60_000, maxEntries: 500 }, () => createCommerceEmbedding(normalizedQuery));
}

export async function searchLiveMarketplaceProducts(input: {
  query: string;
  filters: SearchFilters;
  fallbackProducts: Product[];
  buyerLocation?: BuyerLocation | null;
  locale?: AppLocale;
  context?: RecommendationContext;
  behaviorEvents?: CommerceBehaviorEvent[];
  anonymousId?: string;
}): Promise<MarketplaceSearchResult> {
  const started = Date.now();
  const locale = input.locale ?? "en";
  const profile = buildPersonalizationProfile({
    events: input.behaviorEvents,
    products: input.fallbackProducts,
    buyerLocation: input.buyerLocation,
    anonymousId: input.anonymousId,
  });
  const context = {
    ...input.context,
    ...profile.sessionSignals,
    recentQueries: [...new Set([...(input.context?.recentQueries ?? []), ...(profile.sessionSignals.recentQueries ?? [])])],
    exploredCategorySlugs: [...new Set([...(input.context?.exploredCategorySlugs ?? []), ...(profile.sessionSignals.exploredCategorySlugs ?? [])])],
    isNewUser: input.context?.isNewUser ?? profile.isColdStart,
  };
  const discoveryPlan = buildSemanticDiscoveryPlan(input.query, locale, true);
  const expandedQueries = expandQuery(discoveryPlan.normalizedQuery);
  const expandedQueryText = expandedQueries.join(" OR ");
  const fallback = () => searchMarketplaceProducts(expandedQueryText, input.fallbackProducts, input.filters, input.buyerLocation, locale, context);
  const cacheKey = stableCacheKey([
    "live-marketplace-search",
    input.query.trim().toLocaleLowerCase(),
    input.filters,
    input.buyerLocation ? { latitude: input.buyerLocation.latitude?.toFixed(3), longitude: input.buyerLocation.longitude?.toFixed(3) } : null,
    locale,
    profile.fingerprint,
  ]);

  return withRequestCache(cacheKey, { ttlMs: 20_000, maxEntries: 250 }, () => withTrace("ai", "ai.marketplace_search", async (trace) => {
  try {
    const supabase = await createSupabaseServerClient();
    const embedding = await createCachedCommerceEmbedding(expandedQueries.join(" "));
    const categoryId = input.filters.category === "all" ? null : uuidOrNull(input.filters.category);
    const { data, error } = await supabase.rpc("search_products_hybrid", {
      query_text: expandedQueryText,
      query_embedding: vectorToSqlLiteral(embedding.embedding),
      match_count: 60,
      category_filter: categoryId,
    });

    if (error || !data?.length) throw error ?? new Error("Vector retrieval returned no candidates.");

    const rows = data as HybridRpcRow[];
    const hydrated = await hydrateProducts(rows.map((row) => row.id));
    const productMap = byId(hydrated.map((item) => item.product));
    const diagnosticsMap = new Map(hydrated.map((item) => [item.product.id, item.diagnostics]));
    const rpcScores = byId(rows);
    const candidates = rows.flatMap((row) => {
      const product = productMap.get(row.id);
      return product ? [product] : [];
    });

    let result = searchMarketplaceProducts(expandedQueryText, candidates, input.filters, input.buyerLocation, locale, context);
    const adaptiveRanking = rankCommerceCandidates({
      candidates: result.results.map((item) => ({
        product: item.product,
        semanticScore: rpcScores.get(item.product.id)?.semantic_score ?? item.semanticScore,
        fuzzyScore: rpcScores.get(item.product.id)?.fuzzy_score ?? item.fuzzyScore,
        keywordScore: rpcScores.get(item.product.id)?.keyword_score ?? item.keywordScore,
      })),
      products: candidates,
      query: discoveryPlan.normalizedQuery,
      buyerLocation: input.buyerLocation,
      context,
      profile,
      control: {
        experimentKey: "phase33-adaptive-commerce-default",
        replaySeed: stableCacheKey([input.query, input.filters, profile.fingerprint]),
      },
    });
    result = {
      ...result,
      mode: result.mode === "keyword" || result.mode === "fuzzy" ? "hybrid" : result.mode,
      latencyMs: Math.max(1, Date.now() - started),
      results: adaptiveRanking.results.map((item) => {
        const score = rpcScores.get(item.product.id);
        const diagnostics = diagnosticsMap.get(item.product.id);
        return {
          ...item,
          semanticScore: score?.semantic_score ?? item.semanticScore,
          fuzzyScore: score?.fuzzy_score ?? item.fuzzyScore,
          keywordScore: score?.keyword_score ?? item.keywordScore,
          operationalScore: score?.operational_score ?? item.operationalScore,
          score: Math.max(item.score, score?.hybrid_score ?? item.score),
          explanations: [...(item.explanations ?? []), diagnostics?.embeddingFreshness ?? "embedding tracked"].slice(0, 5),
        };
      }),
      intelligence: {
        ...result.intelligence,
        summary: `${adaptiveRanking.results.length} live matches ranked with pgvector retrieval, adaptive personalization, keyword/fuzzy fallback, geo feasibility, stock, and seller quality.`,
        fallbackUsed: false,
        signals: [
          "pgvector similarity",
          "keyword and fuzzy match",
          "distance",
          "delivery feasibility",
          "stock availability",
          "seller quality",
          "multilingual relevance",
          "embedding freshness",
          "adaptive behavior profile",
          "ranking replay diagnostics",
        ],
      },
    };

    await recordSearchEvent(result, {
      provider: embedding.provider,
      model: embedding.model,
      vectorCandidates: rows.length,
      locale,
      source: "live-pgvector",
      traceId: trace.traceId,
      personalizationFingerprint: profile.fingerprint,
      rankingDiagnostics: JSON.stringify(adaptiveRanking.diagnostics),
      semanticPlan: discoveryPlan.retrievalMode,
      transliterationExpansions: expandedQueries.length - 1,
    });

    recordOperationalEvent("info", "ai.vector_search.completed", {
      queryLength: input.query.length,
      resultCount: result.results.length,
      vectorCandidates: rows.length,
      latencyMs: result.latencyMs,
      locale,
      fallbackUsed: false,
      personalizationColdStart: profile.isColdStart,
      overBudget: result.latencyMs > performanceBudgets.aiRetrievalP95Ms,
    }, { domain: "ai", trace, durationMs: result.latencyMs });

    return result;
  } catch (error) {
    const result = fallback();
    const hardenedResult = {
      ...result,
      latencyMs: Math.max(1, Date.now() - started),
      intelligence: {
        ...result.intelligence,
        fallbackUsed: true,
        summary: `${result.intelligence.summary} Live vector retrieval degraded, so keyword, fuzzy, geo, and operational ranking handled this search.`,
      },
    };

    recordOperationalEvent("warn", "ai.vector_search.fallback", {
      queryLength: input.query.length,
      resultCount: hardenedResult.results.length,
      error: error instanceof Error ? error.message.slice(0, 140) : "unknown",
      latencyMs: hardenedResult.latencyMs,
      locale,
      overBudget: hardenedResult.latencyMs > performanceBudgets.aiRetrievalP95Ms,
    }, { domain: "ai", trace, durationMs: hardenedResult.latencyMs, error });

    await recordSearchEvent(hardenedResult, {
      source: "fallback-local-hybrid",
      locale,
      error: error instanceof Error ? error.message.slice(0, 180) : "unknown",
      traceId: trace.traceId,
    });

    return hardenedResult;
  }
  }, { queryLength: input.query.length, locale }));
}

export async function getLiveRelatedProductIds(sourceProductId: string, limit = 8) {
  return withRequestCache(stableCacheKey(["related-products", sourceProductId, limit]), { ttlMs: 5 * 60_000, maxEntries: 500 }, () => getLiveRelatedProductIdsUncached(sourceProductId, limit));
}

async function getLiveRelatedProductIdsUncached(sourceProductId: string, limit = 8) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("related_products_by_vector", {
      source_product_id: sourceProductId,
      match_count: limit,
    });

    if (error) throw error;
    return ((data ?? []) as RecommendationRow[]).map((row) => row.id);
  } catch (error) {
    recordOperationalEvent("warn", "ai.related_vector.fallback", {
      sourceProductId,
      error: error instanceof Error ? error.message.slice(0, 140) : "unknown",
    }, { domain: "ai", error });
    return [];
  }
}

export async function getEmbeddingFreshnessDiagnostics(limit = 25) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug, embedding_model, embedding_updated_at, updated_at, search_quality_score")
    .eq("status", "ACTIVE")
    .is("deleted_at", null)
    .order("embedding_updated_at", { ascending: true, nullsFirst: true })
    .limit(limit);

  if (error) throw error;

  return ((data ?? []) as Array<Pick<Tables<"products">, "id" | "name" | "slug" | "embedding_model" | "embedding_updated_at" | "updated_at" | "search_quality_score">>).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    embeddingModel: row.embedding_model ?? "missing",
    embeddingUpdatedAt: row.embedding_updated_at,
    stale: !row.embedding_updated_at || new Date(row.embedding_updated_at).getTime() < new Date(row.updated_at).getTime(),
    searchQualityScore: row.search_quality_score,
  }));
}
