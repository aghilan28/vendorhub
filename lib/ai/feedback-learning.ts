import { createHash } from "crypto";

export type FeedbackSignalType = "click" | "purchase" | "skip" | "search_refinement" | "cart_abandonment" | "delivery_satisfaction" | "refund";

export interface FeedbackSignal {
  type: FeedbackSignalType;
  productId?: string;
  vendorId?: string;
  query?: string;
  createdAt: string;
  replayNonce?: string;
}

export interface FeedbackLearningSnapshot {
  replayKey: string;
  events: number;
  positiveRate: number;
  negativeRate: number;
  driftDetected: boolean;
  staleModelDetected: boolean;
  replayAnomalyDetected: boolean;
  adaptiveDecayFactor: number;
  rankingAdjustment: number;
  recommendationAdjustment: number;
  recoveryActions: string[];
}

const positive = new Set<FeedbackSignalType>(["click", "purchase", "delivery_satisfaction"]);
const negative = new Set<FeedbackSignalType>(["skip", "search_refinement", "cart_abandonment", "refund"]);

export function buildFeedbackLearningSnapshot(signals: FeedbackSignal[], modelUpdatedAt?: string | null): FeedbackLearningSnapshot {
  const sorted = [...signals].sort((left, right) => `${left.createdAt}:${left.type}:${left.productId ?? ""}`.localeCompare(`${right.createdAt}:${right.type}:${right.productId ?? ""}`));
  const replayFingerprints = sorted.map((signal) => [signal.type, signal.productId, signal.vendorId, signal.query, signal.createdAt, signal.replayNonce ?? ""].join(":"));
  const replayAnomalyDetected = new Set(replayFingerprints).size < replayFingerprints.length;
  const positives = sorted.filter((signal) => positive.has(signal.type)).length;
  const negatives = sorted.filter((signal) => negative.has(signal.type)).length;
  const events = sorted.length;
  const positiveRate = events ? positives / events : 0;
  const negativeRate = events ? negatives / events : 0;
  const latestEvent = sorted.at(-1)?.createdAt;
  const modelAgeHours = modelUpdatedAt ? (Date.now() - new Date(modelUpdatedAt).getTime()) / 3_600_000 : Number.POSITIVE_INFINITY;
  const staleModelDetected = modelAgeHours > 24 && events > 20;
  const driftDetected = events > 15 && negativeRate > positiveRate * 1.2;
  const latestAgeHours = latestEvent ? Math.max(0, (Date.now() - new Date(latestEvent).getTime()) / 3_600_000) : Number.POSITIVE_INFINITY;
  const adaptiveDecayFactor = Math.max(0.25, Math.min(1, Math.exp(-latestAgeHours / 168)));

  return {
    replayKey: createHash("sha256").update(JSON.stringify(replayFingerprints)).digest("hex"),
    events,
    positiveRate,
    negativeRate,
    driftDetected,
    staleModelDetected,
    replayAnomalyDetected,
    adaptiveDecayFactor,
    rankingAdjustment: replayAnomalyDetected || driftDetected ? -0.08 : Math.min(0.06, positiveRate * 0.05 * adaptiveDecayFactor),
    recommendationAdjustment: staleModelDetected || replayAnomalyDetected ? -0.05 : Math.min(0.05, positiveRate * 0.04 * adaptiveDecayFactor),
    recoveryActions: replayAnomalyDetected
      ? ["ignore duplicate replay signals", "rebuild aggregate from durable events", "record replay anomaly alert"]
      : driftDetected
        ? ["trigger ranking recalibration", "increase negative feedback decay", "compare search refinement and refund clusters"]
        : staleModelDetected
          ? ["refresh feedback model snapshot", "recompute recommendation aggregates", "verify telemetry freshness"]
          : ["normal feedback learning"],
  };
}
