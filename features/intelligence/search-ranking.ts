import { buildEmbeddingInput } from "@/lib/ai/embedding-config";
import { cosineSimilarity, createDeterministicEmbedding, tokenizeForIntelligence } from "@/lib/ai/local-embeddings";
import { getSearchAliases, localizeProduct } from "@/features/localization/catalog";
import { normalizeVernacularQuery } from "@/lib/india/vernacular";
import { deliveryFeasibility } from "@/lib/geo";
import type { AppLocale } from "@/lib/i18n/config";
import type { BuyerLocation, Product } from "@/types";
import { applyDiversityBalancing, rankingPipelineDiagnostics, scoreHybridRank } from "./hybrid-ranking";
import type { MarketplaceSearchResult, RankedProduct, RecommendationContext, SearchFilters, SearchMode } from "./types";

const typoCorrections: Record<string, string> = {
  hedphones: "headphones",
  headphnes: "headphones",
  "iph ne": "iphone",
  iphne: "iphone",
  snikers: "sneakers",
  snkrs: "sneakers",
  vegitable: "vegetable",
  coffe: "coffee",
  bananna: "banana",
  ofice: "office",
};

const queryExpansions: Record<string, string[]> = {
  cheap: ["budget", "deal", "affordable", "discount"],
  healthy: ["millet", "banana", "makhana", "fresh", "low oil", "breakfast"],
  snacks: ["puffs", "makhana", "ready meals", "tea-time"],
  gaming: ["gaming", "mouse", "accessories", "keyboard"],
  accessories: ["case", "mouse", "headphones", "wireless"],
  comfortable: ["ergonomic", "cushion", "adjustable", "office"],
  office: ["desk", "chair", "work", "ergonomic"],
  wireless: ["bluetooth", "wireless", "headphones"],
  tamatar: ["tomato", "fresh produce"],
};

const transliterationExpansions: Record<string, string[]> = {
  mobile: ["phone", "case", "electronics"],
  cover: ["case", "phone cover"],
  chips: ["snacks", "ready meals"],
  samosa: ["snacks", "ready meals"],
  chair: ["office chair", "ergonomic", "lifestyle"],
  tomato: ["tamatar", "fresh produce"],
  idli: ["breakfast", "batter"],
  dosa: ["breakfast", "batter"],
};

function normalizeQuery(query: string) {
  const vernacular = normalizeVernacularQuery(query);
  return Object.entries(typoCorrections).reduce((value, [typo, correction]) => {
    const pattern = new RegExp(`\\b${typo}\\b`, "gi");
    return value.replace(pattern, correction);
  }, vernacular.expandedQuery);
}

function getProductDocument(product: Product, locale: AppLocale = "en") {
  const localized = localizeProduct(product, locale);
  return buildEmbeddingInput([
    product.name,
    localized.name,
    product.description,
    localized.description,
    product.category.name,
    localized.category.name,
    product.vendor.name,
    localized.vendor.name,
    product.vendor.locality,
    product.unit,
    ...(product.tags ?? []),
    ...(product.trustSignals ?? []),
    ...Object.values(product.specs ?? {}),
    ...getSearchAliases(product),
  ]);
}

function trigrams(value: string) {
  const normalized = `  ${value.toLowerCase()}  `;
  return Array.from({ length: Math.max(0, normalized.length - 2) }, (_, index) => normalized.slice(index, index + 3));
}

function trigramSimilarity(left: string, right: string) {
  const leftSet = new Set(trigrams(left));
  const rightSet = new Set(trigrams(right));
  if (!leftSet.size || !rightSet.size) return 0;
  const intersection = [...leftSet].filter((token) => rightSet.has(token)).length;
  return (2 * intersection) / (leftSet.size + rightSet.size);
}

function keywordScore(queryTokens: string[], product: Product, locale: AppLocale = "en") {
  if (!queryTokens.length) return 0.5;
  const document = getProductDocument(product, locale).toLowerCase();
  const matches = queryTokens.filter((token) => document.includes(token)).length;
  return matches / queryTokens.length;
}

function buildSuggestions(query: string, products: Product[], locale: AppLocale = "en") {
  const tokens = tokenizeForIntelligence(query);
  const productTerms = products.flatMap((product) => {
    const localized = localizeProduct(product, locale);
    return [product.name, localized.name, product.category.name, localized.category.name, ...(product.tags ?? []), ...getSearchAliases(product)];
  });
  const direct = productTerms.filter((term) => term.toLowerCase().includes(query.toLowerCase()) && query.length > 1);
  const expanded = tokens.flatMap((token) => [...(queryExpansions[token] ?? []), ...(transliterationExpansions[token] ?? [])]);
  const localeDefaults =
    locale === "ta"
      ? ["mobile cover", "snacks", "idli batter", "nearby store"]
      : locale === "hi"
        ? ["mobile cover", "chair", "samosa near me", "nearby seller"]
        : ["healthy snacks", "wireless headphones", "office chair", "breakfast deals", "popular nearby"];
  return [...new Set([...direct, ...expanded, ...localeDefaults])].slice(0, 7);
}

function detectMode(query: string, correctedQuery: string, top: RankedProduct[]): SearchMode {
  if (!query.trim()) return "hybrid";
  if (query.toLowerCase() !== correctedQuery) return "fuzzy";
  if (top[0]?.semanticScore > top[0]?.keywordScore + 0.2) return "semantic";
  if (top[0]?.fuzzyScore > top[0]?.keywordScore + 0.2) return "fuzzy";
  return "hybrid";
}

export function searchMarketplaceProducts(
  query: string,
  products: Product[],
  filters: SearchFilters,
  buyerLocation?: BuyerLocation | null,
  locale: AppLocale = "en",
  context?: RecommendationContext,
): MarketplaceSearchResult {
  const started = performance.now();
  const correctedQuery = normalizeQuery(query);
  const expandedQuery = [correctedQuery, ...tokenizeForIntelligence(correctedQuery).flatMap((token) => [...(queryExpansions[token] ?? []), ...(transliterationExpansions[token] ?? [])])].join(" ");
  const queryTokens = tokenizeForIntelligence(expandedQuery);
  const queryEmbedding = createDeterministicEmbedding(expandedQuery || "popular nearby marketplace products");
  const coldStartActive = !query.trim() || Boolean(context?.isNewUser);

  let ranked = products
    .filter((product) => filters.category === "all" || product.category.slug === filters.category)
    .filter((product) => filters.availability === "all" || product.stockCount > 0)
    .filter((product) => {
      if (!filters.price || filters.price === "all") return true;
      if (filters.price === "under-100") return product.price <= 100;
      if (filters.price === "under-500") return product.price <= 500;
      return product.price <= 1000;
    })
    .filter((product) => {
      if (!filters.rating || filters.rating === "all") return true;
      if (filters.rating === "4-5-plus") return product.rating >= 4.5;
      return product.rating >= 4;
    })
    .filter((product) => {
      if (!filters.deliveryTime || filters.deliveryTime === "all") return true;
      if (filters.deliveryTime === "under-30") return (product.deliveryMinutes ?? 999) <= 30;
      return (product.deliveryMinutes ?? 999) <= 45;
    })
    .filter((product) => {
      if (!filters.nearbyOnly && !filters.radiusKm) return true;
      const feasibility = deliveryFeasibility(product.vendor, buyerLocation);
      return feasibility.distanceKm === null || feasibility.distanceKm <= (filters.radiusKm ?? 6);
    })
    .map((product) => {
      const document = getProductDocument(product, locale);
      const semanticScore = (cosineSimilarity(queryEmbedding, createDeterministicEmbedding(document)) + 1) / 2;
      const fuzzyScore = Math.max(trigramSimilarity(correctedQuery, product.name), trigramSimilarity(correctedQuery, document));
      const keyword = keywordScore(queryTokens, product, locale);
      const item = scoreHybridRank({
        product,
        products,
        query: expandedQuery,
        semanticScore,
        fuzzyScore,
        keywordScore: keyword,
        buyerLocation,
        locale,
        context,
      });

      return { ...item, product: localizeProduct(product, locale) } satisfies RankedProduct;
    })
    .filter((item) => !query.trim() || item.score > 0.28 || item.keywordScore > 0 || item.fuzzyScore > 0.2);

  if (filters.sort === "price-low") ranked = ranked.sort((a, b) => a.product.price - b.product.price);
  else if (filters.sort === "rating") ranked = ranked.sort((a, b) => b.product.rating - a.product.rating);
  else if (filters.sort === "nearest") ranked = ranked.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  else if (filters.sort === "fastest") ranked = ranked.sort((a, b) => (a.product.deliveryMinutes ?? 999) - (b.product.deliveryMinutes ?? 999));
  else if (filters.sort === "availability") ranked = ranked.sort((a, b) => b.product.stockCount - a.product.stockCount);
  else ranked = applyDiversityBalancing(ranked);

  const mode = detectMode(query, correctedQuery, ranked);
  const fallbackUsed = ranked.length === 0 || ranked[0]?.score < 0.34;
  const confidence = ranked[0]?.score > 0.7 ? "high" : ranked.length && !fallbackUsed ? "medium" : "fallback";
  const signals = ["name", "category", "distance", "delivery", "availability", "seller", "popularity", "freshness"];

  return {
    query,
    correctedQuery: correctedQuery !== query.trim().toLowerCase() ? correctedQuery : undefined,
    mode,
    latencyMs: Math.max(1, Math.round(performance.now() - started)),
    results: ranked,
    suggestions: buildSuggestions(correctedQuery, products, locale),
    alternatives: ["popular nearby", "available now", "fast delivery", "highly rated"].filter((item) => item !== correctedQuery),
    intelligence: {
      summary: ranked.length
        ? `${ranked.length} results for ${query.trim() ? `'${query.trim()}'` : "nearby products"}.`
        : `No results found for ${query.trim() ? `'${query.trim()}'` : "this search"}.`,
      confidence,
      signals,
      fallbackUsed,
      pipeline: rankingPipelineDiagnostics,
      coldStart: {
        active: coldStartActive,
        strategy: coldStartActive ? "Popular nearby products available now" : "Products matched to this search",
        signals: coldStartActive
          ? ["nearby", "available now", "popular", "fresh picks"]
          : ["search terms", "local availability", "seller", "delivery"],
      },
    },
  };
}
