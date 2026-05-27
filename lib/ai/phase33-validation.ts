import { evaluateAiCommerceTelemetry } from "./observability";
import { aiRecoveryAction, type AiFailureMode } from "./recovery";

export function simulatePhase33AiLoad(input: {
  searches: number;
  recommendationRequests: number;
  embeddingRefreshes: number;
  queueSaturation: number;
  rerankingSpikes?: number;
  multilingualQueries?: number;
  replayStorms?: number;
}) {
  const retrievalLatencyMs = 120 + Math.ceil(input.searches / 18) + Math.ceil(input.queueSaturation * 220);
  const rerankingLatencyMs = 90 + Math.ceil((input.rerankingSpikes ?? 0) * 220) + Math.ceil(input.searches / 60);
  const queueLatencyMs = 200 + Math.ceil(input.embeddingRefreshes / 3) + Math.ceil(input.recommendationRequests / 8) + Math.ceil(input.queueSaturation * 1200) + Math.ceil((input.replayStorms ?? 0) * 450);
  const multilingualPressure = Math.min(1, (input.multilingualQueries ?? 0) / Math.max(1, input.searches));
  const telemetry = {
    retrievalLatencyMs,
    recommendationCtr: Math.max(0.012, 0.08 - input.recommendationRequests / 20000 - input.queueSaturation * 0.01),
    semanticMatchQuality: Math.max(0.35, 0.78 - input.queueSaturation * 0.18 - multilingualPressure * 0.04),
    rankingDrift: Math.min(0.6, input.queueSaturation * 0.3),
    embeddingFreshnessRatio: Math.max(0.55, 1 - input.embeddingRefreshes / 5000),
    personalizationAccuracy: Math.max(0.45, 0.74 - input.queueSaturation * 0.08),
    queueLatencyMs,
    hallucinationSignals: 0,
    retrievalFallbackRate: Math.min(0.6, input.queueSaturation * 0.35),
    rerankingInstability: Math.min(0.4, input.queueSaturation * 0.22),
    recommendationFreshnessRatio: Math.max(0.5, 1 - input.recommendationRequests / 12000 - input.queueSaturation * 0.08),
    rerankingLatencyMs,
    semanticMismatchRate: Math.min(0.5, multilingualPressure * 0.12 + input.queueSaturation * 0.08),
    replayAnomalyRate: Math.min(0.2, (input.replayStorms ?? 0) * 0.04),
  };
  return {
    telemetry,
    alerts: evaluateAiCommerceTelemetry(telemetry),
    stable: telemetry.retrievalFallbackRate < 0.55 && telemetry.replayAnomalyRate < 0.12 && telemetry.rerankingLatencyMs < 1200,
  };
}

export function simulatePhase33Failure(mode: AiFailureMode) {
  return {
    mode,
    actions: aiRecoveryAction(mode),
    marketplaceUsable: true,
    replaySafe: mode !== "none",
    gracefulDegradation: mode === "none" ? "not_required" : "fallback_paths_active",
  };
}
