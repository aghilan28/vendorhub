/**
 * KARTEX Phase E — AI platform. Governs deterministic/heuristic intelligence +
 * embedding provider as production assets: registry (ownership/versioning/state),
 * inference seam (timeout + breaker + fallback + metrics), and drift detection.
 */
export {
  listModels,
  getModel,
  validateGovernance,
  canTransition,
  registrySummary,
} from "./registry";
export type { ModelEntry, ModelState, RiskLevel, GovernanceViolation } from "./registry";
export { runInference, INFERENCE_LATENCY_TARGETS_MS } from "./inference";
export type { InferenceOptions } from "./inference";
export {
  populationStabilityIndex,
  psiStatus,
  toDistribution,
  freshnessDrift,
  embeddingCentroidDrift,
  centroid,
  aggregateDrift,
  PSI_THRESHOLDS,
} from "./drift";
export type { DriftStatus, DriftReport } from "./drift";
