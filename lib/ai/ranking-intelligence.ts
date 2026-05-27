import type { BuyerLocation, Product } from "@/types";
import type { RankedProduct, RankingWeights, RecommendationContext } from "@/features/intelligence/types";
import { applyDiversityBalancing, scoreHybridRank } from "@/features/intelligence/hybrid-ranking";
import { defaultHybridRankingWeights, normalizeRankingWeights } from "@/features/intelligence/ranking-config";
import { personalizationScore, type PersonalizationProfile } from "./personalization";

export interface RankingControlPlane {
  experimentKey?: string;
  degradedMode?: boolean;
  weights?: Partial<RankingWeights>;
  diversityLimit?: number;
  replaySeed?: string;
}

export interface CandidateRankingInput {
  product: Product;
  semanticScore: number;
  fuzzyScore: number;
  keywordScore: number;
}

function adaptiveWeights(control?: RankingControlPlane, profile?: PersonalizationProfile | null): RankingWeights {
  const behaviorBoost = profile && !profile.isColdStart ? 0.04 : 0;
  const degradedPenalty = control?.degradedMode ? -0.06 : 0;
  return normalizeRankingWeights({
    ...defaultHybridRankingWeights,
    semantic: Math.max(0.08, defaultHybridRankingWeights.semantic + degradedPenalty),
    keyword: defaultHybridRankingWeights.keyword + (control?.degradedMode ? 0.05 : 0),
    fuzzy: defaultHybridRankingWeights.fuzzy + (control?.degradedMode ? 0.03 : 0),
    behavioral: defaultHybridRankingWeights.behavioral + behaviorBoost,
    sellerQuality: defaultHybridRankingWeights.sellerQuality + 0.02,
    inventoryHealth: defaultHybridRankingWeights.inventoryHealth + 0.02,
    ...(control?.weights ?? {}),
  });
}

function rankingDriftScore(results: RankedProduct[]) {
  if (results.length < 2) return 0;
  const scoreSpread = Math.abs(results[0].score - results[results.length - 1].score);
  const semanticAverage = results.reduce((sum, item) => sum + item.semanticScore, 0) / results.length;
  const behavioralAverage = results.reduce((sum, item) => sum + (item.behavioralScore ?? 0), 0) / results.length;
  return Math.max(0, Math.min(1, Math.abs(behavioralAverage - semanticAverage) * 0.55 + (scoreSpread < 0.04 ? 0.22 : 0)));
}

function rankingRepairActions(input: { driftScore: number; degradedMode: boolean; candidateCount: number }) {
  if (input.degradedMode) return ["freeze adaptive weights", "serve deterministic hybrid order", "record degraded replay snapshot"];
  if (input.candidateCount === 0) return ["use keyword fallback candidates", "check retrieval health", "avoid empty personalized reranking"];
  if (input.driftScore > 0.35) return ["replay ranking snapshot", "cap behavioral boost", "compare semantic and operational score distributions"];
  return ["normal adaptive ranking"];
}

export function rankCommerceCandidates(input: {
  candidates: CandidateRankingInput[];
  products: Product[];
  query: string;
  buyerLocation?: BuyerLocation | null;
  context?: RecommendationContext;
  profile?: PersonalizationProfile | null;
  control?: RankingControlPlane;
}): { results: RankedProduct[]; diagnostics: Record<string, unknown> } {
  const weights = adaptiveWeights(input.control, input.profile);
  const ranked = input.candidates.map((candidate) => {
    const item = scoreHybridRank({
      product: candidate.product,
      products: input.products,
      query: input.query,
      semanticScore: candidate.semanticScore,
      fuzzyScore: candidate.fuzzyScore,
      keywordScore: candidate.keywordScore,
      buyerLocation: input.buyerLocation,
      context: input.context,
      weights,
    });
    const adaptiveBehavior = personalizationScore(candidate.product, input.profile);
    return {
      ...item,
      score: Math.max(0, item.score + adaptiveBehavior * weights.behavioral),
      behavioralScore: Math.max(item.behavioralScore ?? 0, adaptiveBehavior),
      explanations: [...(item.explanations ?? []), input.profile?.isColdStart ? "cold-start controlled ranking" : "adaptive behavior-aware ranking"].slice(0, 5),
    };
  });
  const driftScore = rankingDriftScore(ranked);

  return {
    results: applyDiversityBalancing(ranked, input.control?.diversityLimit),
    diagnostics: {
      experimentKey: input.control?.experimentKey ?? "default",
      degradedMode: Boolean(input.control?.degradedMode),
      replaySeed: input.control?.replaySeed ?? "deterministic-score-order",
      weights,
      candidateCount: input.candidates.length,
      personalizationFingerprint: input.profile?.fingerprint ?? null,
      driftScore,
      replayDebuggable: true,
      deterministicTieBreak: "score-desc-preserved-input-order",
      repairActions: rankingRepairActions({
        driftScore,
        degradedMode: Boolean(input.control?.degradedMode),
        candidateCount: input.candidates.length,
      }),
    },
  };
}
