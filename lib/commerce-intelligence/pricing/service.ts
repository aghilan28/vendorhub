import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { M } from "@/lib/observability/metrics";
import { operateDomain } from "../domain";
import { computePriceProposal, type PricingSignals } from "./engine";
import type { PriceProposal } from "../types";

/**
 * Phase F — Pricing service. Produces a GOVERNED price proposal: computed by the
 * deterministic engine, run through the domain seam (inference governance +
 * decision ledger), and persisted to pricing_proposals with an approve/apply/
 * rollback trail. High-risk / guardrail-breaching changes are NEVER auto-applied;
 * they require human approval. Pricing directly affects revenue, so the default
 * action is `proposed` (advisory), not `applied`.
 */
export async function proposePrice(
  signals: PricingSignals,
  context: { actorId?: string; traceId?: string } = {},
): Promise<{ proposal: PriceProposal; proposalId: string | null; decisionId: string }> {
  const { result: proposal, recorded } = await operateDomain<PriceProposal>({
    domain: "pricing",
    decisionType: "price_proposal",
    modelKey: "pricing-intelligence",
    subjectType: "product",
    subjectId: signals.productId,
    inputs: { currentPriceMinor: signals.currentPriceMinor, strategy: signals.strategy, inventory: signals.inventory, demand: signals.demand },
    action: "proposed",
    reversible: true,
    actorId: context.actorId,
    traceId: context.traceId,
    decide: async () => {
      const p = computePriceProposal(signals);
      // confidence inversely related to change magnitude + risk
      const confidence = p.risk === "low" ? 0.9 : p.risk === "medium" ? 0.7 : 0.5;
      return { decision: { ...p }, result: p, confidence };
    },
    fallback: () => {
      const hold: PriceProposal = {
        productId: signals.productId,
        vendorId: signals.vendorId,
        currentPriceMinor: Math.max(1, Math.round(signals.currentPriceMinor)),
        proposedPriceMinor: Math.max(1, Math.round(signals.currentPriceMinor)),
        currency: signals.currency ?? "INR",
        strategy: "static",
        changePct: 0,
        reasons: ["pricing engine unavailable — hold current price (safe fallback)"],
        guardrailBreached: false,
        risk: "low",
        autoApplyEligible: false,
      };
      return { decision: { ...hold }, result: hold, confidence: 1 };
    },
  });

  try {
    M.pricingProposals.inc({ strategy: proposal.strategy, status: "proposed" });
  } catch {
    /* never throw */
  }

  // Best-effort persistence (storage + governance trail).
  let proposalId: string | null = null;
  try {
    const db = createSupabaseAdminClient() as unknown as { from: (t: string) => any };
    const { data } = await db
      .from("pricing_proposals")
      .insert({
        product_id: proposal.productId,
        vendor_id: proposal.vendorId ?? null,
        current_price_minor: proposal.currentPriceMinor,
        proposed_price_minor: proposal.proposedPriceMinor,
        currency: proposal.currency,
        strategy: proposal.strategy,
        reasons: proposal.reasons,
        guardrail_breached: proposal.guardrailBreached,
        risk: proposal.risk,
        status: "proposed",
        decision_id: recorded.persisted ? recorded.id : null,
        proposed_by: context.actorId ?? null,
      })
      .select("id")
      .single();
    if (data && typeof data.id === "string") proposalId = data.id;
  } catch {
    /* persistence is best-effort; the decision ledger event already captured it */
  }

  return { proposal, proposalId, decisionId: recorded.id };
}

export async function listPricingProposals(options: { vendorId?: string; status?: string; limit?: number } = {}): Promise<unknown[]> {
  try {
    const db = createSupabaseAdminClient() as unknown as { from: (t: string) => any };
    let q = db.from("pricing_proposals").select("*");
    if (options.vendorId) q = q.eq("vendor_id", options.vendorId);
    if (options.status) q = q.eq("status", options.status);
    const { data, error } = await q.order("created_at", { ascending: false }).limit(Math.min(options.limit ?? 50, 200));
    if (error) return [];
    return (data ?? []) as unknown[];
  } catch {
    return [];
  }
}
