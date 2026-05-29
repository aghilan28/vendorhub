import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { M } from "@/lib/observability/metrics";
import { withTimeout } from "@/lib/reliability/timeout";
import { recordAdvancedDecision } from "./decision-log";

/**
 * Phase G — Simulation runtime. The Tier 10 simulation functions (bass diffusion,
 * civilizational projection, structural demography, strategic competition, ...)
 * are real but STATELESS + unauthenticated. This makes a run an OPERATED unit:
 * bounded (timeout), timed, persisted to simulation_runs, audited in the ledger,
 * and monitored. `compute` is injected by the caller (route) so this layer stays
 * decoupled from the Tier 10 internals.
 */
export async function runSimulation<T>(
  model: string,
  inputs: Record<string, unknown>,
  compute: () => T | Promise<T>,
  context: { actorId?: string; traceId?: string; timeoutMs?: number } = {},
): Promise<{ model: string; outputs: T | null; status: "completed" | "failed"; durationMs: number; runId: string | null; decisionId: string }> {
  const startedAt = Date.now();
  let outputs: T | null = null;
  let status: "completed" | "failed" = "completed";
  try {
    outputs = await withTimeout(`simulation:${model}`, context.timeoutMs ?? 5000, async () => compute());
  } catch {
    status = "failed";
  }
  const durationMs = Date.now() - startedAt;

  try {
    M.simulationRuns.inc({ model, status });
    M.simulationLatency.observe(durationMs / 1000, { model });
  } catch {
    /* never throw */
  }

  const recorded = await recordAdvancedDecision({
    domain: "simulation",
    decisionType: model,
    subjectType: "simulation_model",
    subjectId: model,
    inputs,
    decision: { status, durationMs },
    action: "advisory",
    actorId: context.actorId,
    traceId: context.traceId,
  });

  let runId: string | null = null;
  try {
    const db = createSupabaseAdminClient() as unknown as { from: (t: string) => any };
    const { data } = await db
      .from("simulation_runs")
      .insert({
        model,
        inputs,
        outputs: (outputs ?? null) as unknown,
        status,
        duration_ms: durationMs,
        requested_by: context.actorId ?? null,
        decision_id: recorded.persisted ? recorded.id : null,
      })
      .select("id")
      .single();
    if (data && typeof data.id === "string") runId = data.id;
  } catch {
    /* best-effort persistence */
  }

  return { model, outputs, status, durationMs, runId, decisionId: recorded.id };
}
