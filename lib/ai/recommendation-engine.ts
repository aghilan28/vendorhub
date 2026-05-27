import type { Product } from "@/types";
import type { ProductRecommendation } from "@/features/intelligence/types";
import { getHomepageRecommendations, getRelatedProducts } from "@/features/intelligence/recommendations";
import { contextFromPersonalization, type PersonalizationProfile } from "./personalization";

export type RecommendationSurface = "related_products" | "personalized_feed" | "hyperlocal_discovery" | "trending_products" | "repeat_purchase" | "seller_discovery" | "cross_category";

export interface RecommendationBundle {
  surface: RecommendationSurface;
  generatedAt: string;
  ttlSeconds: number;
  recommendations: ProductRecommendation[];
  diagnostics: {
    freshness: "fresh" | "aging" | "stale";
    diversitySellers: number;
    diversityCategories: number;
    personalizationFingerprint?: string;
    recoveryMode: boolean;
    freshnessRisk: boolean;
    recalibrationRecommended: boolean;
    diversityBalanced: boolean;
    repairActions: string[];
  };
}

function freshnessFor(ttlSeconds: number, generatedAt: Date, now = new Date()) {
  const ageSeconds = Math.max(0, (now.getTime() - generatedAt.getTime()) / 1000);
  if (ageSeconds <= ttlSeconds * 0.5) return "fresh";
  if (ageSeconds <= ttlSeconds) return "aging";
  return "stale";
}

function diversifyRecommendations(items: ProductRecommendation[], limit: number) {
  const seenSeller = new Map<string, number>();
  const seenCategory = new Map<string, number>();

  return [...items]
    .map((item) => {
      const sellerCount = seenSeller.get(item.product.vendor.id) ?? 0;
      const categoryCount = seenCategory.get(item.product.category.slug) ?? 0;
      seenSeller.set(item.product.vendor.id, sellerCount + 1);
      seenCategory.set(item.product.category.slug, categoryCount + 1);
      const repeatPenalty = sellerCount * 0.03 + categoryCount * 0.018;
      const explorationBoost = sellerCount === 0 && categoryCount <= 1 ? 0.012 : 0;
      return {
        ...item,
        score: Math.max(0, item.score - repeatPenalty + explorationBoost),
        explanations: [...(item.explanations ?? []), repeatPenalty > 0 ? "diversity repeat controlled" : "diversity slot preserved"].slice(0, 5),
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

export function buildRecommendationBundle(input: {
  surface: RecommendationSurface;
  products: Product[];
  sourceProduct?: Product;
  profile?: PersonalizationProfile | null;
  limit?: number;
  recoveryMode?: boolean;
}): RecommendationBundle {
  const limit = input.limit ?? 8;
  const context = contextFromPersonalization(input.profile);
  const base =
    input.surface === "related_products" && input.sourceProduct
      ? getRelatedProducts(input.sourceProduct, input.products, limit, context)
      : getHomepageRecommendations(input.products, [], limit, context);
  const ttlSeconds = input.surface === "trending_products" || input.surface === "personalized_feed" ? 900 : 1800;
  const generatedAt = new Date();
  const recommendations = diversifyRecommendations(base.map((item, index) => ({
    ...item,
    score: Math.max(0, item.score - index * 0.006 + (input.profile?.drift.detected ? -0.02 : 0)),
    explanations: [...(item.explanations ?? []), `${input.surface.replace(/_/g, " ")} freshness controlled`].slice(0, 5),
  })), limit);
  const freshness = freshnessFor(ttlSeconds, generatedAt);
  const diversitySellers = new Set(recommendations.map((item) => item.product.vendor.id)).size;
  const diversityCategories = new Set(recommendations.map((item) => item.product.category.slug)).size;
  const freshnessRisk = freshness !== "fresh" || Boolean(input.profile?.drift.stalePreferenceRisk);
  const recalibrationRecommended = Boolean(input.profile?.recalibrationNeeded || input.profile?.drift.detected || input.recoveryMode);

  return {
    surface: input.surface,
    generatedAt: generatedAt.toISOString(),
    ttlSeconds,
    recommendations,
    diagnostics: {
      freshness,
      diversitySellers,
      diversityCategories,
      personalizationFingerprint: input.profile?.fingerprint,
      recoveryMode: Boolean(input.recoveryMode),
      freshnessRisk,
      recalibrationRecommended,
      diversityBalanced: diversitySellers > 1 || diversityCategories > 1 || recommendations.length <= 1,
      repairActions: recalibrationRecommended
        ? ["refresh personalization profile", "widen recommendation diversity", "shorten recommendation TTL"]
        : freshnessRisk
          ? ["recompute recommendation snapshot", "blend local trending products", "verify cache invalidation"]
          : ["normal recommendation delivery"],
    },
  };
}
