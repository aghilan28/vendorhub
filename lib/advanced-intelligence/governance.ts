import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { M } from "@/lib/observability/metrics";
import { recordAdvancedDecision } from "./decision-log";
import type { GovernanceEvaluation, GovernancePolicy, PolicyResult, PolicyRule, RuleCondition } from "./types";

/**
 * Phase G — Governance & Constitution runtime (policy engine + rule engine +
 * decision/approval workflows + constitution registry). The rule evaluator is
 * PURE + deterministic (testable); persistence/audit are best-effort. Outcome
 * policy: any failed `critical` policy => rejected; any failed `high` => escalated;
 * otherwise approved.
 */

function getField(subject: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, subject);
}

function evalCondition(c: RuleCondition, subject: Record<string, unknown>): boolean {
  const actual = getField(subject, c.field);
  switch (c.op) {
    case "eq":
      return actual === c.value;
    case "neq":
      return actual !== c.value;
    case "gt":
      return typeof actual === "number" && actual > (c.value as number);
    case "gte":
      return typeof actual === "number" && actual >= (c.value as number);
    case "lt":
      return typeof actual === "number" && actual < (c.value as number);
    case "lte":
      return typeof actual === "number" && actual <= (c.value as number);
    case "in":
      return Array.isArray(c.value) && (c.value as unknown[]).includes(actual);
    case "exists":
      return actual !== undefined && actual !== null;
    case "truthy":
      return Boolean(actual);
    default:
      return false;
  }
}

/** Evaluate a single policy rule against a subject. Returns pass + human reasons. */
export function evaluateRule(rule: PolicyRule, subject: Record<string, unknown>): { passed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  let passed = true;

  if (rule.allOf) {
    for (const c of rule.allOf) {
      if (!evalCondition(c, subject)) {
        passed = false;
        reasons.push(`required ${c.field} ${c.op} ${JSON.stringify(c.value)} not met`);
      }
    }
  }
  if (rule.anyOf && rule.anyOf.length > 0) {
    const any = rule.anyOf.some((c) => evalCondition(c, subject));
    if (!any) {
      passed = false;
      reasons.push(`none of anyOf conditions on [${rule.anyOf.map((c) => c.field).join(", ")}] met`);
    }
  }
  if (rule.none) {
    for (const c of rule.none) {
      if (evalCondition(c, subject)) {
        passed = false;
        reasons.push(`forbidden ${c.field} ${c.op} ${JSON.stringify(c.value)} present`);
      }
    }
  }
  if (passed) reasons.push("ok");
  return { passed, reasons };
}

/** Evaluate a subject against a set of policies and derive a governance outcome. */
export function evaluatePolicies(policies: GovernancePolicy[], subject: Record<string, unknown>): GovernanceEvaluation {
  const results: PolicyResult[] = policies.map((p) => {
    const { passed, reasons } = evaluateRule(p.rule, subject);
    return { policyKey: p.policyKey, severity: p.severity, passed, reasons };
  });
  const failedCritical = results.filter((r) => !r.passed && r.severity === "critical").map((r) => r.policyKey);
  const failedHigh = results.filter((r) => !r.passed && r.severity === "high").map((r) => r.policyKey);
  const outcome: GovernanceEvaluation["outcome"] =
    failedCritical.length > 0 ? "rejected" : failedHigh.length > 0 ? "escalated" : "approved";
  return { outcome, results, failedCritical, failedHigh };
}

/** Load active governance policies from the registry (best-effort). */
export async function loadActivePolicies(): Promise<GovernancePolicy[]> {
  try {
    const db = createSupabaseAdminClient() as unknown as { from: (t: string) => any };
    const { data, error } = await db.from("governance_policies").select("*").eq("status", "active");
    if (error || !Array.isArray(data)) return [];
    return (data as any[]).map((r) => ({ policyKey: r.policy_key, title: r.title, rule: r.rule, severity: r.severity }));
  } catch {
    return [];
  }
}

/** Run a governed decision: evaluate policies, persist the decision + audit it. */
export async function decideWithGovernance(
  subjectType: string,
  subjectId: string | undefined,
  proposal: Record<string, unknown>,
  context: { policies?: GovernancePolicy[]; actorId?: string; traceId?: string } = {},
): Promise<{ evaluation: GovernanceEvaluation; decisionId: string }> {
  const policies = context.policies ?? (await loadActivePolicies());
  const evaluation = evaluatePolicies(policies, proposal);

  try {
    M.governanceEvaluations.inc({ outcome: evaluation.outcome });
  } catch {
    /* never throw */
  }

  const recorded = await recordAdvancedDecision({
    domain: "governance",
    decisionType: "policy_evaluation",
    subjectType,
    subjectId,
    inputs: proposal,
    decision: { outcome: evaluation.outcome, failedCritical: evaluation.failedCritical, failedHigh: evaluation.failedHigh },
    action: evaluation.outcome === "approved" ? "applied" : "proposed",
    reversible: true,
    actorId: context.actorId,
    traceId: context.traceId,
  });

  // Persist a governance_decisions row (best-effort).
  try {
    const db = createSupabaseAdminClient() as unknown as { from: (t: string) => any };
    await db.from("governance_decisions").insert({
      subject_type: subjectType,
      subject_id: subjectId ?? null,
      proposal,
      evaluation: evaluation as unknown as Record<string, unknown>,
      outcome: evaluation.outcome === "approved" ? "approved" : evaluation.outcome === "rejected" ? "rejected" : "escalated",
      decided_by: context.actorId ?? null,
      decided_at: evaluation.outcome === "approved" ? new Date().toISOString() : null,
      decision_id: recorded.persisted ? recorded.id : null,
    });
  } catch {
    /* best-effort */
  }

  return { evaluation, decisionId: recorded.id };
}

/** Constitution registry: register a new version (draft) + audit. */
export async function registerConstitution(
  input: { version: string; title: string; documentHash: string; summary?: string; supersedes?: string },
  context: { actorId?: string } = {},
): Promise<{ persisted: boolean; decisionId: string }> {
  let persisted = false;
  try {
    const db = createSupabaseAdminClient() as unknown as { from: (t: string) => any };
    const { error } = await db.from("constitution_versions").insert({
      version: input.version,
      title: input.title,
      document_hash: input.documentHash,
      summary: input.summary ?? null,
      status: "draft",
      supersedes: input.supersedes ?? null,
    });
    persisted = !error;
  } catch {
    /* best-effort */
  }
  const recorded = await recordAdvancedDecision({
    domain: "constitution",
    decisionType: "register_version",
    subjectType: "constitution",
    subjectId: input.version,
    inputs: { documentHash: input.documentHash, supersedes: input.supersedes },
    decision: { status: "draft", title: input.title },
    action: "proposed",
    actorId: context.actorId,
  });
  return { persisted, decisionId: recorded.id };
}
