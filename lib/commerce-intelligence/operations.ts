import "server-only";
import { listIntelligenceDecisions } from "./decision-log";
import type { IntelligenceDomain } from "./types";

/**
 * Phase F — Domain Operationalization Map (F.2). Declares, per domain, whether
 * the operational primitives exist: storage, events, inference, API, monitoring,
 * recovery, owner. "operated" = data enters, decisions occur, and operators can
 * audit/control it. This is the machine-readable source for /api/intelligence/operations.
 */
export type DomainOps = {
  domain: IntelligenceDomain;
  owner: string;
  algorithm: "exists" | "partial" | "missing";
  storage: boolean; // persisted decisions / state
  events: boolean; // emits events
  inference: boolean; // governed inference seam available
  api: boolean; // operator API exists
  monitoring: boolean; // metrics/alerts
  recovery: boolean; // fallback / replay / rollback
  businessMetric: string;
  notes: string;
};

export const OPERATIONALIZATION: DomainOps[] = [
  { domain: "pricing", owner: "commerce-platform", algorithm: "exists", storage: true, events: true, inference: true, api: true, monitoring: true, recovery: true, businessMetric: "kartex_pricing_proposals_total", notes: "Governed proposals; high-risk never auto-applied (Phase F)" },
  { domain: "forecasting", owner: "data-platform", algorithm: "exists", storage: true, events: true, inference: true, api: false, monitoring: true, recovery: true, businessMetric: "kartex_intelligence_decisions_total", notes: "executive-intelligence/forecasting; ledger via domain seam; API pending (F-H1)" },
  { domain: "inventory", owner: "commerce-platform", algorithm: "exists", storage: true, events: true, inference: true, api: false, monitoring: true, recovery: true, businessMetric: "kartex_inventory_drift", notes: "hyperlocal-operations reorder/spoilage; ledger via seam; API pending (F-H1)" },
  { domain: "supply", owner: "logistics-platform", algorithm: "partial", storage: true, events: true, inference: false, api: false, monitoring: true, recovery: true, businessMetric: "kartex_intelligence_decisions_total", notes: "supply graph via Neo4j (Phase B) not yet projected (F-H3)" },
  { domain: "routing", owner: "logistics-platform", algorithm: "exists", storage: true, events: true, inference: false, api: true, monitoring: true, recovery: true, businessMetric: "kartex_intelligence_decisions_total", notes: "DB RPC run_live_dispatch_intelligence / routing_refresh; execution gated on scheduler (D-C1)" },
  { domain: "fulfillment", owner: "logistics-platform", algorithm: "exists", storage: true, events: true, inference: false, api: true, monitoring: true, recovery: true, businessMetric: "kartex_intelligence_decisions_total", notes: "dispatch/SLA/failover RPCs + Shiprocket; gated on scheduler (D-C1)" },
  { domain: "search", owner: "discovery-platform", algorithm: "exists", storage: true, events: true, inference: true, api: true, monitoring: true, recovery: true, businessMetric: "kartex_search_queries_total", notes: "route through runInference for AI metrics (E-H4)" },
  { domain: "recommendation", owner: "growth-platform", algorithm: "exists", storage: true, events: true, inference: true, api: false, monitoring: true, recovery: true, businessMetric: "kartex_intelligence_decisions_total", notes: "route through seam (E-H4/F-H1)" },
  { domain: "seller", owner: "commerce-platform", algorithm: "exists", storage: true, events: true, inference: true, api: true, monitoring: true, recovery: true, businessMetric: "kartex_intelligence_decisions_total", notes: "seller snapshot/intelligence routes exist; wire ledger (F-H1)" },
  { domain: "buyer", owner: "growth-platform", algorithm: "exists", storage: true, events: true, inference: true, api: false, monitoring: true, recovery: true, businessMetric: "kartex_intelligence_decisions_total", notes: "personalization profile; PII-sensitive; API pending (F-H1)" },
  { domain: "telemetry", owner: "data-platform", algorithm: "exists", storage: true, events: true, inference: false, api: true, monitoring: true, recovery: true, businessMetric: "kartex_analytics_telemetry", notes: "decisions fan out to analytics telemetry topic (Phase B)" },
];

export async function buildOperationsSnapshot() {
  const decisions = (await listIntelligenceDecisions({ limit: 200 })) as Array<{ domain?: string; created_at?: string }>;
  const now = Date.now();
  const byDomain: Record<string, { count: number; lastDecisionAt: string | null; lastAgeSeconds: number | null }> = {};
  for (const d of decisions) {
    const dom = d.domain ?? "unknown";
    const entry = (byDomain[dom] ??= { count: 0, lastDecisionAt: null, lastAgeSeconds: null });
    entry.count += 1;
    if (d.created_at && (!entry.lastDecisionAt || d.created_at > entry.lastDecisionAt)) {
      entry.lastDecisionAt = d.created_at;
      entry.lastAgeSeconds = Math.round((now - new Date(d.created_at).getTime()) / 1000);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    domains: OPERATIONALIZATION.map((d) => ({
      ...d,
      operated: d.storage && d.events && d.monitoring && (d.api || d.inference),
      live: byDomain[d.domain] ?? { count: 0, lastDecisionAt: null, lastAgeSeconds: null },
    })),
    ledgerSampleSize: decisions.length,
  };
}
