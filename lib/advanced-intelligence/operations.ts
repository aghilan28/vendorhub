import "server-only";
import { listAdvancedDecisions } from "./decision-log";
import type { AdvancedDomain } from "./types";

/**
 * Phase G — System Operationalization Map (G.2). Per advanced domain: owner +
 * which operational primitives exist (storage / events / workflows / API /
 * monitoring / recovery / governance). `/api/advanced/operations` adds live
 * decision freshness from the ledger.
 */
export type AdvancedDomainOps = {
  domain: AdvancedDomain;
  owner: string;
  reality: "exists" | "partial" | "prototype" | "missing";
  storage: boolean;
  events: boolean;
  workflows: boolean;
  api: boolean;
  monitoring: boolean;
  recovery: boolean;
  governance: boolean;
  notes: string;
};

export const ADVANCED_OPERATIONALIZATION: AdvancedDomainOps[] = [
  { domain: "knowledge", owner: "Knowledge Council", reality: "partial", storage: true, events: true, workflows: true, api: true, monitoring: true, recovery: true, governance: true, notes: "knowledge_units + validation gate + lineage + ledger (Phase G); Neo4j projection pending (E-H2/G-H2)" },
  { domain: "ontology", owner: "Knowledge Council", reality: "partial", storage: true, events: true, workflows: false, api: false, monitoring: true, recovery: true, governance: true, notes: "ontology_registry + versioning; validation workflow + API pending (G-H1)" },
  { domain: "research", owner: "Research Board", reality: "partial", storage: true, events: true, workflows: true, api: false, monitoring: true, recovery: true, governance: true, notes: "research_registry + workflow_state; engine + API pending (G-H1)" },
  { domain: "simulation", owner: "Simulation Lab", reality: "exists", storage: true, events: true, workflows: true, api: true, monitoring: true, recovery: true, governance: true, notes: "Tier 10 compute now stateful+audited via runSimulation + simulation_runs (Phase G)" },
  { domain: "governance", owner: "Governance Board", reality: "exists", storage: true, events: true, workflows: true, api: true, monitoring: true, recovery: true, governance: true, notes: "policy/rule engine + governance_decisions + approval workflow (Phase G)" },
  { domain: "constitution", owner: "Governance Board", reality: "partial", storage: true, events: true, workflows: true, api: true, monitoring: true, recovery: true, governance: true, notes: "constitution_versions register/ratify; full ratification workflow pending (G-H3)" },
  { domain: "meta", owner: "Knowledge Council", reality: "partial", storage: true, events: true, workflows: false, api: false, monitoring: true, recovery: true, governance: true, notes: "lineage via knowledge_units.derived_from; dependency graph + provenance API pending (G-H2)" },
  { domain: "civilizational", owner: "Strategy Office", reality: "prototype", storage: true, events: true, workflows: false, api: true, monitoring: true, recovery: true, governance: true, notes: "Tier 10 civilizational projection compute exists; operated via simulation runtime; dedicated models pending (G-M1)" },
];

export async function buildAdvancedOperationsSnapshot() {
  const decisions = (await listAdvancedDecisions({ limit: 200 })) as Array<{ domain?: string; created_at?: string }>;
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
    domains: ADVANCED_OPERATIONALIZATION.map((d) => ({
      ...d,
      operated: d.storage && d.events && d.monitoring && (d.api || d.workflows),
      live: byDomain[d.domain] ?? { count: 0, lastDecisionAt: null, lastAgeSeconds: null },
    })),
    ledgerSampleSize: decisions.length,
  };
}
