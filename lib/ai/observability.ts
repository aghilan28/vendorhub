export interface AiCommerceTelemetry {
  retrievalLatencyMs: number;
  recommendationCtr: number;
  semanticMatchQuality: number;
  rankingDrift: number;
  embeddingFreshnessRatio: number;
  personalizationAccuracy: number;
  queueLatencyMs: number;
  hallucinationSignals: number;
  retrievalFallbackRate: number;
  rerankingInstability: number;
  recommendationFreshnessRatio?: number;
  rerankingLatencyMs?: number;
  semanticMismatchRate?: number;
  replayAnomalyRate?: number;
}

export interface AiCommerceAlert {
  id: string;
  severity: "info" | "warning" | "critical";
  signal: string;
  action: string;
}

export function evaluateAiCommerceTelemetry(input: AiCommerceTelemetry): AiCommerceAlert[] {
  const alerts: AiCommerceAlert[] = [];
  if (input.embeddingFreshnessRatio < 0.82) alerts.push({ id: "embedding-staleness", severity: input.embeddingFreshnessRatio < 0.65 ? "critical" : "warning", signal: `${Math.round(input.embeddingFreshnessRatio * 100)}% fresh embeddings`, action: "Run stale embedding refresh and verify vector indexing jobs." });
  if (input.retrievalLatencyMs > 900 || input.retrievalFallbackRate > 0.25) alerts.push({ id: "retrieval-degradation", severity: input.retrievalFallbackRate > 0.45 ? "critical" : "warning", signal: `${input.retrievalLatencyMs}ms retrieval, ${Math.round(input.retrievalFallbackRate * 100)}% fallback`, action: "Inspect vector search latency, fallback paths, and semantic candidate counts." });
  if (input.recommendationCtr < 0.025) alerts.push({ id: "recommendation-collapse", severity: input.recommendationCtr < 0.01 ? "critical" : "warning", signal: `${Math.round(input.recommendationCtr * 1000) / 10}% CTR`, action: "Recalculate recommendations, widen diversity, and inspect freshness decay." });
  if (input.rankingDrift > 0.35 || input.rerankingInstability > 0.25) alerts.push({ id: "ranking-drift", severity: input.rankingDrift > 0.55 ? "critical" : "warning", signal: `${Math.round(input.rankingDrift * 100)}% drift`, action: "Freeze experimental weights, replay ranking diagnostics, and compare deterministic snapshots." });
  if (input.queueLatencyMs > 1800) alerts.push({ id: "ai-queue-saturation", severity: input.queueLatencyMs > 3600 ? "critical" : "warning", signal: `${input.queueLatencyMs}ms AI queue latency`, action: "Throttle bulk recomputation and keep interactive discovery ahead of heavy jobs." });
  if (input.semanticMatchQuality < 0.42 || input.hallucinationSignals > 0) alerts.push({ id: "semantic-quality-risk", severity: input.hallucinationSignals > 3 ? "critical" : "warning", signal: `${Math.round(input.semanticMatchQuality * 100)}% match quality`, action: "Lower confidence thresholds, use keyword fallback, and review query normalization." });
  if ((input.semanticMismatchRate ?? 0) > 0.18) alerts.push({ id: "semantic-mismatch-spike", severity: (input.semanticMismatchRate ?? 0) > 0.34 ? "critical" : "warning", signal: `${Math.round((input.semanticMismatchRate ?? 0) * 100)}% semantic mismatch`, action: "Replay multilingual queries, inspect alias expansion, and temporarily raise keyword weighting." });
  if ((input.recommendationFreshnessRatio ?? 1) < 0.76) alerts.push({ id: "recommendation-freshness-risk", severity: (input.recommendationFreshnessRatio ?? 1) < 0.55 ? "critical" : "warning", signal: `${Math.round((input.recommendationFreshnessRatio ?? 0) * 100)}% fresh recommendations`, action: "Invalidate stale recommendation cache and enqueue recalculation with diversity balancing." });
  if (input.personalizationAccuracy < 0.48) alerts.push({ id: "personalization-drift", severity: input.personalizationAccuracy < 0.36 ? "critical" : "warning", signal: `${Math.round(input.personalizationAccuracy * 100)}% personalization accuracy`, action: "Recalibrate profiles, decay stale affinities, and blend cold-start local demand." });
  if ((input.rerankingLatencyMs ?? 0) > 500) alerts.push({ id: "reranking-latency-spike", severity: (input.rerankingLatencyMs ?? 0) > 900 ? "critical" : "warning", signal: `${input.rerankingLatencyMs}ms reranking`, action: "Cap candidate count, freeze experimental rerankers, and serve deterministic hybrid ranking." });
  if ((input.replayAnomalyRate ?? 0) > 0.02) alerts.push({ id: "replay-anomalies", severity: (input.replayAnomalyRate ?? 0) > 0.08 ? "critical" : "warning", signal: `${Math.round((input.replayAnomalyRate ?? 0) * 100)}% replay anomalies`, action: "Audit idempotency keys, durable telemetry, and feedback aggregation windows." });

  return alerts.length ? alerts : [{ id: "ai-commerce-healthy", severity: "info", signal: "AI commerce signals within guardrails", action: "Continue monitoring retrieval, ranking, personalization, and feedback loops." }];
}
