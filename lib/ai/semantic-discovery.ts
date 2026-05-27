import { normalizeVernacularQuery } from "@/lib/india/vernacular";
import type { AppLocale } from "@/lib/i18n/config";

type QueryScript = "latin" | "tamil" | "devanagari";

export interface SemanticDiscoveryPlan {
  originalQuery: string;
  normalizedQuery: string;
  locale: AppLocale;
  retrievalMode: "hybrid" | "semantic_fallback" | "keyword_fallback";
  confidenceFloor: number;
  signals: string[];
  diagnostics: SemanticDiscoveryDiagnostics;
  fallback: {
    reason: SemanticFallbackReason;
    degradedMode: boolean;
    repairActions: string[];
  };
}

export type SemanticFallbackReason = "none" | "empty_query" | "vector_unavailable" | "low_confidence" | "mixed_language" | "stale_embeddings";

export interface SemanticDiscoveryDiagnostics {
  script: QueryScript;
  expansions: string[];
  mixedLanguage: boolean;
  typoToleranceEnabled: boolean;
  localityAware: boolean;
  replayKey: string;
  observabilityTags: string[];
}

const mixedLanguageTerms: Record<string, string> = {
  kaapi: "coffee",
  saapadu: "meal food",
  sabzi: "vegetables",
  atta: "wheat flour",
  dahi: "curd yogurt",
  pazham: "fruit banana",
  mobilecover: "mobile cover phone case",
};

function deterministicReplayKey(parts: string[]) {
  let hash = 0;
  for (const char of parts.join("|")) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return `semantic-${hash.toString(16).padStart(8, "0")}`;
}

function semanticFallbackReason(input: {
  shortOrEmpty: boolean;
  vectorAvailable: boolean;
  confidenceFloor: number;
  mixedLanguage: boolean;
  staleEmbeddingRatio?: number;
}): SemanticFallbackReason {
  if (input.shortOrEmpty) return "empty_query";
  if (!input.vectorAvailable) return "vector_unavailable";
  if (typeof input.staleEmbeddingRatio === "number" && input.staleEmbeddingRatio > 0.3) return "stale_embeddings";
  if (input.confidenceFloor < 0.3) return input.mixedLanguage ? "mixed_language" : "low_confidence";
  return "none";
}

export function buildSemanticDiscoveryPlan(
  query: string,
  locale: AppLocale = "en",
  vectorAvailable = true,
  options: { staleEmbeddingRatio?: number; locality?: string | null } = {},
): SemanticDiscoveryPlan {
  const vernacular = normalizeVernacularQuery(query, locale);
  const script = vernacular.script as QueryScript;
  const compact = vernacular.expandedQuery.toLowerCase().replace(/\s+/g, "");
  const regionalExpansion = mixedLanguageTerms[compact] ?? "";
  const normalizedQuery = [vernacular.expandedQuery, regionalExpansion].filter(Boolean).join(" ").trim();
  const shortOrEmpty = normalizedQuery.length < 2;
  const mixedLanguage = script !== "latin" || vernacular.expansions.length > 0 || Boolean(regionalExpansion);
  const confidenceFloor = shortOrEmpty ? 0.24 : locale === "ta" || locale === "hi" ? 0.28 : 0.32;
  const reason = semanticFallbackReason({
    shortOrEmpty,
    vectorAvailable,
    confidenceFloor,
    mixedLanguage,
    staleEmbeddingRatio: options.staleEmbeddingRatio,
  });

  return {
    originalQuery: query,
    normalizedQuery: normalizedQuery || "popular nearby marketplace products",
    locale,
    retrievalMode: vectorAvailable && !shortOrEmpty ? "hybrid" : vectorAvailable ? "semantic_fallback" : "keyword_fallback",
    confidenceFloor,
    signals: [
      "multilingual normalization",
      "transliterated commerce query support",
      "vector and keyword blending",
      "low-confidence fallback",
      "retrieval explainability",
      "semantic replay diagnostics",
      "stale embedding awareness",
    ],
    diagnostics: {
      script,
      expansions: [...vernacular.expansions, ...(regionalExpansion ? [regionalExpansion] : [])],
      mixedLanguage,
      typoToleranceEnabled: true,
      localityAware: Boolean(options.locality),
      replayKey: deterministicReplayKey([query, normalizedQuery, locale, String(vectorAvailable), options.locality ?? "market"]),
      observabilityTags: [
        `locale:${locale}`,
        `script:${script}`,
        `mode:${vectorAvailable && !shortOrEmpty ? "hybrid" : vectorAvailable ? "semantic_fallback" : "keyword_fallback"}`,
        mixedLanguage ? "mixed-language" : "single-language",
        options.locality ? "locality-aware" : "market-wide",
      ],
    },
    fallback: {
      reason,
      degradedMode: reason !== "none",
      repairActions:
        reason === "stale_embeddings"
          ? ["schedule stale embedding refresh", "prefer keyword and fuzzy candidates", "record semantic replay diagnostics"]
          : reason === "vector_unavailable"
            ? ["serve keyword and fuzzy fallback", "check vector index health", "record retrieval fallback rate"]
            : reason === "empty_query"
              ? ["serve popular nearby products", "lower confidence floor", "avoid vector-only matching"]
              : reason === "mixed_language" || reason === "low_confidence"
                ? ["expand transliteration aliases", "blend keyword candidates", "capture low-confidence diagnostics"]
                : ["normal hybrid retrieval"],
    },
  };
}
