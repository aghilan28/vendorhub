import { describe, expect, it } from "vitest";
import { buildFeedbackLearningSnapshot } from "@/lib/ai/feedback-learning";
import { evaluateAiCommerceTelemetry } from "@/lib/ai/observability";
import { buildPersonalizationProfile } from "@/lib/ai/personalization";
import { simulatePhase33AiLoad, simulatePhase33Failure } from "@/lib/ai/phase33-validation";
import { buildRecommendationBundle } from "@/lib/ai/recommendation-engine";
import { aiRecoveryAction } from "@/lib/ai/recovery";
import { rankCommerceCandidates } from "@/lib/ai/ranking-intelligence";
import { buildSemanticDiscoveryPlan } from "@/lib/ai/semantic-discovery";
import { createProduct, createVendor, multilingualProducts, reliabilityBuyerLocation } from "../utils/fixtures";

describe("Phase 33 AI commerce hardening", () => {
  it("builds multilingual semantic plans with replay diagnostics and stale embedding repair", () => {
    const plan = buildSemanticDiscoveryPlan("mobilecover", "hi", true, { locality: "Indiranagar", staleEmbeddingRatio: 0.42 });

    expect(plan.retrievalMode).toBe("hybrid");
    expect(plan.normalizedQuery).toContain("mobile cover");
    expect(plan.diagnostics.replayKey).toMatch(/^semantic-/);
    expect(plan.diagnostics.localityAware).toBe(true);
    expect(plan.fallback.reason).toBe("stale_embeddings");
    expect(plan.fallback.repairActions).toContain("schedule stale embedding refresh");
  });

  it("detects personalization drift without storing raw identifiers", () => {
    const now = new Date().toISOString();
    const profile = buildPersonalizationProfile({
      products: multilingualProducts(),
      buyerLocation: reliabilityBuyerLocation,
      anonymousId: "anon-phase-33",
      events: [
        { type: "skip", productId: "prod-tomato", createdAt: now },
        { type: "cart_abandonment", productId: "prod-mobile-cover", createdAt: now },
        { type: "refund", productId: "prod-mobile-cover", createdAt: now },
        { type: "search_refinement", query: "mobile", createdAt: now },
        { type: "skip", productId: "prod-tomato", createdAt: now },
        { type: "product_click", productId: "prod-tomato", createdAt: now },
      ],
    });

    expect(profile.recalibrationNeeded).toBe(true);
    expect(profile.drift.detected).toBe(true);
    expect(profile.privacy.rawIdentifiersStored).toBe(false);
  });

  it("keeps recommendation bundles fresh, diverse, and recalibration-aware", () => {
    const products = [
      ...multilingualProducts(),
      createProduct({ id: "prod-idli", slug: "idli", name: "Idli Batter", category: { id: "cat-breakfast", name: "Breakfast", slug: "breakfast" }, vendor: createVendor({ id: "vendor-breakfast" }) }),
    ];
    const profile = buildPersonalizationProfile({
      products,
      events: [{ type: "refund", productId: "prod-mobile-cover", createdAt: new Date().toISOString() }],
      anonymousId: "anon-recommendation",
    });

    const bundle = buildRecommendationBundle({ surface: "personalized_feed", products, profile, limit: 3 });

    expect(bundle.recommendations).toHaveLength(3);
    expect(bundle.diagnostics.recalibrationRecommended).toBe(true);
    expect(bundle.diagnostics.repairActions).toContain("refresh personalization profile");
  });

  it("emits ranking drift diagnostics and repair actions", () => {
    const products = multilingualProducts();
    const ranked = rankCommerceCandidates({
      candidates: products.map((product, index) => ({ product, semanticScore: 0.2 + index * 0.01, fuzzyScore: 0.4, keywordScore: 0.35 })),
      products,
      query: "mobile cover",
      buyerLocation: reliabilityBuyerLocation,
      control: { experimentKey: "test", diversityLimit: 3 },
    });

    expect(ranked.results.length).toBeGreaterThan(0);
    expect(ranked.diagnostics.replayDebuggable).toBe(true);
    expect(ranked.diagnostics.repairActions).toBeInstanceOf(Array);
  });

  it("protects feedback learning from replay anomalies", () => {
    const createdAt = new Date().toISOString();
    const snapshot = buildFeedbackLearningSnapshot([
      { type: "click", productId: "prod-tomato", createdAt },
      { type: "click", productId: "prod-tomato", createdAt },
      { type: "refund", productId: "prod-tomato", createdAt },
    ]);

    expect(snapshot.replayAnomalyDetected).toBe(true);
    expect(snapshot.rankingAdjustment).toBeLessThan(0);
    expect(snapshot.recoveryActions).toContain("ignore duplicate replay signals");
  });

  it("alerts and recovers under semantic and queue saturation failures", () => {
    const load = simulatePhase33AiLoad({
      searches: 2500,
      recommendationRequests: 9000,
      embeddingRefreshes: 2200,
      queueSaturation: 0.9,
      multilingualQueries: 1800,
      rerankingSpikes: 3,
      replayStorms: 3,
    });

    expect(load.alerts.some((alert) => alert.id === "ai-queue-saturation")).toBe(true);
    expect(evaluateAiCommerceTelemetry(load.telemetry).length).toBeGreaterThan(0);
    expect(aiRecoveryAction("semantic_mismatch_flood")).toContain("raise keyword weighting");
    expect(simulatePhase33Failure("recommendation_replay_storm").marketplaceUsable).toBe(true);
  });
});
