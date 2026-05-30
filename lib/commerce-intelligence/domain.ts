import "server-only";
import { runInference } from "@/lib/ai-platform/inference";
import { recordIntelligenceDecision } from "./decision-log";
import type { DecisionAction, IntelligenceDomain, RecordedDecision } from "./types";

/**
 * Phase F — the domain seam. ONE call operationalizes any intelligence domain:
 * it runs the algorithm through the Phase E governed inference seam (timeout +
 * circuit breaker + fallback + AI metrics) and records the result in the Phase F
 * decision ledger (storage + audit + event + business metric). Operators get a
 * uniform, auditable, monitorable decision for pricing/forecast/inventory/
 * routing/search/reco/seller/buyer — no domain is a black box.
 */
export async function operateDomain<T>(opts: {
  domain: IntelligenceDomain;
  decisionType: string;
  modelKey: string;
  subjectType?: string;
  subjectId?: string;
  inputs?: Record<string, unknown>;
  action?: DecisionAction;
  reversible?: boolean;
  actorId?: string;
  traceId?: string;
  timeoutMs?: number;
  /** produces the decision payload + the typed result + optional confidence */
  decide: () => Promise<{ decision: Record<string, unknown>; result: T; confidence?: number }>;
  /** graceful fallback so a domain failure is an operational event, not an outage */
  fallback?: () => { decision: Record<string, unknown>; result: T; confidence?: number };
}): Promise<{ result: T; recorded: RecordedDecision }> {
  const outcome = await runInference(opts.modelKey, opts.decide, {
    timeoutMs: opts.timeoutMs,
    fallback: opts.fallback,
    score: (o) => o.confidence,
  });

  const recorded = await recordIntelligenceDecision({
    domain: opts.domain,
    decisionType: opts.decisionType,
    modelKey: opts.modelKey,
    subjectType: opts.subjectType,
    subjectId: opts.subjectId,
    inputs: opts.inputs,
    decision: outcome.decision,
    action: opts.action,
    reversible: opts.reversible,
    confidence: outcome.confidence,
    actorId: opts.actorId,
    traceId: opts.traceId,
  });

  return { result: outcome.result, recorded };
}
