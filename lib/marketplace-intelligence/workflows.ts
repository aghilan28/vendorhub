// MCP-0E.12 — Intelligence Workflow Engine.
// Turns recommendations into six operable workflows, each producing concrete
// actions. Every workflow that triggers yields actions ready for activation.

import type { IntelligenceRecommendation, IntelligenceWorkflow, WorkflowAction, WorkflowKind } from "./types";

interface WorkflowDef {
  kind: WorkflowKind;
  title: string;
  description: string;
  owner: string;
  matches: IntelligenceRecommendation["kind"][];
}

export const WORKFLOW_DEFS: WorkflowDef[] = [
  { kind: "demand_risk", title: "Demand Risk Workflow", description: "Detect demand collapse / unmet demand and act before it costs revenue.", owner: "Demand Planning", matches: ["marketplace_action", "demand_forecast"] },
  { kind: "inventory_risk", title: "Inventory Risk Workflow", description: "Resolve stockouts, overstock and reorder needs.", owner: "Inventory Lead", matches: ["stockout_risk", "overstock_risk", "reorder"] },
  { kind: "price_optimization", title: "Price Optimization Workflow", description: "Capture margin/revenue from pricing and promotion moves.", owner: "Pricing Lead", matches: ["price_optimization", "promotion"] },
  { kind: "trust_risk", title: "Trust Risk Workflow", description: "Route trust and review-integrity risks to governance.", owner: "Trust & Governance", matches: ["trust_risk"] },
  { kind: "seller_risk", title: "Seller Risk Workflow", description: "Review high-risk sellers (cancellations, returns, disputes).", owner: "Seller Success", matches: ["seller_risk"] },
  { kind: "marketplace_growth", title: "Marketplace Growth Workflow", description: "Pursue category expansion, surges and discovery gaps.", owner: "Growth", matches: ["growth_opportunity"] },
];

function toAction(def: WorkflowDef, rec: IntelligenceRecommendation): WorkflowAction {
  return {
    id: `wf:${def.kind}:${rec.id}`,
    title: rec.title,
    detail: `${rec.detail} → ${rec.action}`,
    owner: def.owner,
    priority: rec.priority,
    sourceRecommendationId: rec.id,
  };
}

export function buildIntelligenceWorkflows(recommendations: IntelligenceRecommendation[]): IntelligenceWorkflow[] {
  return WORKFLOW_DEFS.map((def) => {
    const matched = recommendations.filter((rec) => def.matches.includes(rec.kind));
    const actions = matched.slice(0, 8).map((rec) => toAction(def, rec));
    return {
      kind: def.kind,
      title: def.title,
      description: def.description,
      triggered: matched.length > 0,
      triggerCount: matched.length,
      actions,
    };
  });
}
