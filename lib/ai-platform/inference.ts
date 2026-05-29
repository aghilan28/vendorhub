import "server-only";
import { withTimeout } from "@/lib/reliability/timeout";
import { getCircuitBreaker, CircuitOpenError } from "@/lib/reliability/circuit-breaker";
import { faultInjector } from "@/lib/reliability/fault-injection";
import { recordInference } from "@/lib/observability/metrics";
import { recordOperationalEvent } from "@/lib/observability/core";
import { getModel } from "./registry";

/**
 * Phase E — Inference platform. Every model call goes through one governed seam:
 *  - latency target + timeout (Phase D) so a slow model can't exhaust the request,
 *  - circuit breaker (Phase D) so a failing model fails fast,
 *  - fault injection hook (Phase D) so inference degradation is testable,
 *  - fallback (graceful degradation — a model failure is an operational event),
 *  - AI metrics + trace event (Phase C).
 *
 * Inference NEVER throws to the caller when a fallback is provided.
 */
export type InferenceOptions<T> = {
  timeoutMs?: number;
  fallback?: () => T | Promise<T>;
  /** extract a confidence/quality score in [0,1] for prediction-distribution tracking */
  score?: (result: T) => number | undefined;
  breaker?: false | { failureThreshold?: number; cooldownMs?: number };
};

export async function runInference<T>(modelKey: string, fn: () => Promise<T>, options: InferenceOptions<T> = {}): Promise<T> {
  const model = getModel(modelKey);
  const timeoutMs = options.timeoutMs ?? 1500;
  const startedAt = Date.now();

  const core = async () => {
    await faultInjector.maybeInject(`model:${modelKey}`);
    return withTimeout(`inference:${modelKey}`, timeoutMs, fn);
  };
  const breakerOpts = options.breaker === false ? null : options.breaker;
  const run =
    breakerOpts === null
      ? core
      : () =>
          getCircuitBreaker(`model:${modelKey}`, {
            failureThreshold: breakerOpts?.failureThreshold ?? 5,
            cooldownMs: breakerOpts?.cooldownMs ?? 15000,
          }).execute(core);

  try {
    const result = await run();
    const score = options.score?.(result);
    recordInference(modelKey, Date.now() - startedAt, true, { score });
    return result;
  } catch (error) {
    const reason = error instanceof CircuitOpenError ? "circuit_open" : error instanceof Error ? error.name : "error";
    recordOperationalEvent(options.fallback ? "warn" : "error", "ai.inference.failed", { model: modelKey, reason, version: model?.version }, {
      domain: "ai",
      error,
    });
    if (options.fallback) {
      const fallback = await options.fallback();
      recordInference(modelKey, Date.now() - startedAt, false, { fallback: true, reason });
      return fallback;
    }
    recordInference(modelKey, Date.now() - startedAt, false, { reason });
    throw error;
  }
}

/** Inference contracts: latency budgets per model (ms) used as defaults + SLO source. */
export const INFERENCE_LATENCY_TARGETS_MS: Record<string, number> = {
  "commerce-embedding": 1200,
  "semantic-search": 800,
  "hybrid-ranking": 200,
  "recommendation-engine": 400,
  "personalization-profile": 200,
  "demand-forecasting": 2000,
  "inventory-intelligence": 1000,
  "knowledge-retrieval": 800,
  "pricing-intelligence": 1000,
};
