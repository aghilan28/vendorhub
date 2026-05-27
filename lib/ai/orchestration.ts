import { enqueueAsyncJob, idempotencyKeyFor, persistDurableEvent } from "@/lib/async/orchestrator";
import type { Json } from "@/types/database";
import type { PersonalizationProfile } from "./personalization";

export async function enqueueAiCommerceRefresh(input: {
  reason:
    | "inventory_update"
    | "catalog_update"
    | "behavior_feedback"
    | "ranking_drift"
    | "embedding_stale"
    | "recommendation_stale"
    | "semantic_degradation"
    | "personalization_drift"
    | "realtime_invalidation";
  productId?: string;
  vendorId?: string;
  profile?: PersonalizationProfile;
  trace?: Record<string, Json | undefined>;
}) {
  const key = idempotencyKeyFor(["phase33-ai-commerce", input.reason, input.productId, input.vendorId, input.profile?.fingerprint]);
  const payload = {
    reason: input.reason,
    productId: input.productId,
    vendorId: input.vendorId,
    profileFingerprint: input.profile?.fingerprint,
  };

  await persistDurableEvent({
    source: "ai-commerce-intelligence",
    eventKey: key,
    eventType: input.reason === "behavior_feedback" ? "ai.feedback.aggregate_requested" : "ai.ranking.recalculation_requested",
    payload,
    subjectType: input.productId ? "product" : input.vendorId ? "vendor" : "market",
    subjectId: input.productId ?? input.vendorId,
    trace: input.trace,
    metadata: { phase: "33" },
  });

  return enqueueAsyncJob({
    name:
      input.reason === "behavior_feedback"
        ? "ai.feedback.aggregate"
      : input.reason === "embedding_stale"
          ? "ai.embedding.refresh_stale"
          : input.reason === "recommendation_stale"
            ? "ai.recommendations.recalculate"
            : input.reason === "semantic_degradation"
              ? "ai.retrieval.observe"
              : input.reason === "realtime_invalidation"
                ? "realtime.invalidation.flush"
          : input.profile
            ? "ai.personalization.refresh"
            : "ai.ranking.recalculate",
    payload,
    idempotencyKey: key,
    priority: input.reason === "inventory_update" ? "high" : "normal",
    trace: input.trace,
    metadata: { phase: "33", replaySafe: true },
  });
}
