import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordAdvancedDecision } from "./decision-log";

/**
 * Phase G — Knowledge runtime + meta-knowledge lineage. Knowledge units (claims/
 * evidence/assets) are created, validated (state machine), and linked by lineage
 * (derived_from), with every transition recorded in the decision ledger. The
 * validation gate enforces the Tier 13 invariant "no policy on unsupported claim"
 * at the data layer: a claim cannot reach `verified` without supporting evidence.
 */
export type KnowledgeKind = "claim" | "evidence" | "asset" | "artifact";

export async function createKnowledgeUnit(
  input: { kind: KnowledgeKind; title: string; content?: Record<string, unknown>; provenance?: Record<string, unknown>; derivedFrom?: string[]; owner?: string },
  context: { actorId?: string; traceId?: string } = {},
): Promise<{ id: string | null; persisted: boolean; decisionId: string }> {
  let id: string | null = null;
  let persisted = false;
  try {
    const db = createSupabaseAdminClient() as unknown as { from: (t: string) => any };
    const { data, error } = await db
      .from("knowledge_units")
      .insert({
        kind: input.kind,
        title: input.title,
        content: input.content ?? {},
        provenance: input.provenance ?? {},
        derived_from: input.derivedFrom ?? [],
        validation_state: "unverified",
        owner: input.owner ?? null,
        created_by: context.actorId ?? null,
      })
      .select("id")
      .single();
    if (!error && data && typeof data.id === "string") {
      id = data.id;
      persisted = true;
    }
  } catch {
    /* best-effort */
  }

  const recorded = await recordAdvancedDecision({
    domain: "knowledge",
    decisionType: "create_unit",
    subjectType: input.kind,
    subjectId: id ?? input.title,
    inputs: { provenance: input.provenance, derivedFrom: input.derivedFrom },
    decision: { validationState: "unverified" },
    action: "applied",
    actorId: context.actorId,
    traceId: context.traceId,
  });

  return { id, persisted, decisionId: recorded.id };
}

/**
 * Validate a knowledge unit. Pure gate: a `claim` requires >=1 supporting
 * evidence reference to become `verified`; otherwise it is `quarantined`
 * (epistemic-security invariant). Returns the target state + reasons.
 */
export function evaluateKnowledgeValidation(unit: {
  kind: KnowledgeKind;
  derivedFrom?: string[];
  qualityScore?: number;
}): { state: "verified" | "quarantined" | "verifying"; reasons: string[] } {
  const reasons: string[] = [];
  if (unit.kind === "claim") {
    const support = unit.derivedFrom?.length ?? 0;
    if (support === 0) {
      reasons.push("claim has no supporting evidence (cannot be verified)");
      return { state: "quarantined", reasons };
    }
    if ((unit.qualityScore ?? 0) < 0.5) {
      reasons.push("supporting evidence below quality threshold");
      return { state: "verifying", reasons };
    }
    reasons.push(`claim supported by ${support} evidence unit(s)`);
    return { state: "verified", reasons };
  }
  reasons.push(`${unit.kind} accepted`);
  return { state: "verified", reasons };
}

export async function validateKnowledgeUnit(
  unitId: string,
  unit: { kind: KnowledgeKind; derivedFrom?: string[]; qualityScore?: number },
  context: { actorId?: string; traceId?: string } = {},
): Promise<{ state: string; reasons: string[]; decisionId: string }> {
  const result = evaluateKnowledgeValidation(unit);
  try {
    const db = createSupabaseAdminClient() as unknown as { from: (t: string) => any };
    await db.from("knowledge_units").update({ validation_state: result.state, updated_at: new Date().toISOString() }).eq("id", unitId);
  } catch {
    /* best-effort */
  }
  const recorded = await recordAdvancedDecision({
    domain: "knowledge",
    decisionType: "validate_unit",
    subjectType: unit.kind,
    subjectId: unitId,
    inputs: { derivedFrom: unit.derivedFrom, qualityScore: unit.qualityScore },
    decision: { state: result.state, reasons: result.reasons },
    action: "applied",
    reversible: true,
    actorId: context.actorId,
    traceId: context.traceId,
  });
  return { ...result, decisionId: recorded.id };
}

export async function listKnowledgeUnits(options: { kind?: string; limit?: number } = {}): Promise<unknown[]> {
  try {
    const db = createSupabaseAdminClient() as unknown as { from: (t: string) => any };
    const base = db.from("knowledge_units").select("*");
    const filtered = options.kind ? base.eq("kind", options.kind) : base;
    const { data, error } = await filtered.order("created_at", { ascending: false }).limit(Math.min(options.limit ?? 50, 200));
    if (error) return [];
    return (data ?? []) as unknown[];
  } catch {
    return [];
  }
}
