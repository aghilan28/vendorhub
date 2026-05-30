import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordOperationalEvent } from "@/lib/observability/core";
import { M } from "@/lib/observability/metrics";
import { kafkaRuntime } from "@/lib/runtime/kafka";
import { TOPICS } from "@/lib/runtime/topics";
import type { AdvancedDecisionInput, RecordedAdvancedDecision } from "./types";

/**
 * Phase G — advanced-systems decision ledger. Every knowledge/ontology/research/
 * simulation/governance/constitution decision is recorded: always observable
 * (structured event + metric), durably persisted when the admin client is
 * configured, and fanned out as an event. Total + best-effort (never throws).
 */
export async function recordAdvancedDecision(input: AdvancedDecisionInput): Promise<RecordedAdvancedDecision> {
  const recordedAt = new Date().toISOString();
  const action = input.action ?? "advisory";

  recordOperationalEvent("info", `advanced.${input.domain}.${input.decisionType}`, {
    domain: input.domain,
    decisionType: input.decisionType,
    action,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    confidence: input.confidence,
  }, { domain: "system", trace: input.traceId ? { traceId: input.traceId } : undefined });

  try {
    M.advancedDecisions.inc({ domain: input.domain, action });
  } catch {
    /* never throw */
  }

  let persisted = false;
  let id = `mem-${recordedAt}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    const db = createSupabaseAdminClient() as unknown as { from: (t: string) => any };
    const { data, error } = await db
      .from("advanced_intelligence_decisions")
      .insert({
        domain: input.domain,
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
    /* observable via the event above */
  }

  void kafkaRuntime
    .publish(TOPICS.telemetry, {
      sessionId: input.subjectId ?? input.domain,
      kind: "advanced_decision",
      domain: input.domain,
      decisionType: input.decisionType,
      action,
      decisionId: id,
      recordedAt,
    })
    .catch(() => {});

  return { ...input, action, id, persisted, recordedAt };
}

export async function listAdvancedDecisions(options: { domain?: string; limit?: number } = {}): Promise<unknown[]> {
  try {
    const db = createSupabaseAdminClient() as unknown as { from: (t: string) => any };
    const base = db.from("advanced_intelligence_decisions").select("*");
    const filtered = options.domain ? base.eq("domain", options.domain) : base;
    const { data, error } = await filtered.order("created_at", { ascending: false }).limit(Math.min(options.limit ?? 50, 200));
    if (error) return [];
    return (data ?? []) as unknown[];
  } catch {
    return [];
  }
}
