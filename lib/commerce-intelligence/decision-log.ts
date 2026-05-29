import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordOperationalEvent } from "@/lib/observability/core";
import { M } from "@/lib/observability/metrics";
import { kafkaRuntime } from "@/lib/runtime/kafka";
import { TOPICS } from "@/lib/runtime/topics";
import type { IntelligenceDecisionInput, RecordedDecision } from "./types";

/**
 * Phase F — the unified decision ledger. EVERY commerce-intelligence decision is
 * recorded here so operators can audit "what data entered, what decision, what
 * action, what outcome". Recording is best-effort + total: it ALWAYS emits a
 * structured event + metric (observable), and persists to Postgres when the
 * admin client is configured. Persistence failure never blocks the decision.
 */
export async function recordIntelligenceDecision(input: IntelligenceDecisionInput): Promise<RecordedDecision> {
  const recordedAt = new Date().toISOString();
  const action = input.action ?? "advisory";

  // 1) Always observable (Phase C): structured event + business metric.
  recordOperationalEvent("info", `intelligence.${input.domain}.${input.decisionType}`, {
    domain: input.domain,
    decisionType: input.decisionType,
    action,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    confidence: input.confidence,
  }, { domain: "system", trace: input.traceId ? { traceId: input.traceId } : undefined });

  try {
    M.intelDecisions.inc({ domain: input.domain, action });
  } catch {
    /* never throw */
  }

  // 2) Best-effort durable persistence (storage + audit trail).
  let persisted = false;
  let id = `mem-${recordedAt}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    // New tables are not in the generated Database types; use the established
    // unsafe-client pattern (cf. lib/async/supabase-unsafe, lib/logistics).
    const db = createSupabaseAdminClient() as unknown as {
      from: (t: string) => any;
    };
    const { data, error } = await db
      .from("commerce_intelligence_decisions")
      .insert({
        domain: input.domain,
        model_key: input.modelKey ?? null,
        decision_type: input.decisionType,
        subject_type: input.subjectType ?? null,
        subject_id: input.subjectId ?? null,
        inputs: input.inputs ?? {},
        decision: input.decision,
        action,
        reversible: input.reversible ?? true,
        confidence: input.confidence ?? null,
        actor_id: input.actorId ?? null,
        trace_id: input.traceId ?? null,
      })
      .select("id")
      .single();
    if (!error && data && typeof data.id === "string") {
      id = data.id;
      persisted = true;
    }
  } catch {
    // Admin client unavailable / RLS / network: decision remains observable via the event above.
  }

  // 3) Best-effort event fan-out (telemetry intelligence) — degrade-safe (Phase B).
  void kafkaRuntime
    .publish(TOPICS.telemetry, {
      sessionId: input.subjectId ?? input.domain,
      kind: "intelligence_decision",
      domain: input.domain,
      decisionType: input.decisionType,
      action,
      decisionId: id,
      recordedAt,
    })
    .catch(() => {});

  return { ...input, action, id, persisted, recordedAt };
}

/** Operator audit query — reads the decision ledger (admin client; newest first). */
export async function listIntelligenceDecisions(options: { domain?: string; limit?: number } = {}): Promise<unknown[]> {
  try {
    const db = createSupabaseAdminClient() as unknown as { from: (t: string) => any };
    const base = db.from("commerce_intelligence_decisions").select("*");
    const filtered = options.domain ? base.eq("domain", options.domain) : base;
    const { data, error } = await filtered.order("created_at", { ascending: false }).limit(Math.min(options.limit ?? 50, 200));
    if (error) return [];
    return (data ?? []) as unknown[];
  } catch {
    return [];
  }
}
