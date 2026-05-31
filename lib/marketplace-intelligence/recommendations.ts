// MCP-0E — Unified, rankable, activatable recommendations.
// Folds every engine output into one ordered IntelligenceRecommendation[] so a
// single list can drive the workflow engine and the execution/governance/
// simulation activation connectors.

import type {
  DemandIntelligence,
  GrowthOpportunity,
  IntelligenceRecommendation,
  InventoryIntelligence,
  MarketplaceFabric,
  MarketplaceRisk,
  PricingIntelligence,
  Severity,
} from "./types";

function severityScore(severity: Severity): number {
  switch (severity) {
    case "critical":
      return 92;
    case "warning":
      return 74;
    case "opportunity":
      return 62;
    case "watch":
      return 50;
    default:
      return 32;
  }
}

function priorityFor(severity: Severity): IntelligenceRecommendation["priority"] {
  if (severity === "critical") return "critical";
  if (severity === "warning") return "high";
  if (severity === "opportunity" || severity === "watch") return "medium";
  return "low";
}

export function assembleRecommendations(args: {
  fabric: MarketplaceFabric;
  demand: DemandIntelligence;
  inventory: InventoryIntelligence;
  pricing: PricingIntelligence;
  risks: MarketplaceRisk[];
  growth: GrowthOpportunity[];
}): IntelligenceRecommendation[] {
  const { inventory, pricing, risks, growth } = args;
  const recs: IntelligenceRecommendation[] = [];

  // Inventory → execution
  for (const s of inventory.signals) {
    const kind = s.risk === "stockout" ? "stockout_risk" : s.risk === "overstock" || s.risk === "dead_stock" ? "overstock_risk" : "reorder";
    const severity: Severity = s.risk === "stockout" ? "critical" : s.risk === "watch" ? "warning" : "opportunity";
    recs.push({
      id: `rec:${kind}:${s.productId}`,
      kind,
      scope: "product",
      refId: s.productId,
      severity,
      priority: priorityFor(severity),
      title: `${s.name}: ${s.risk.replace("_", " ")}`,
      detail: s.rationale,
      action: s.suggestedReorder > 0 ? `Reorder ~${s.suggestedReorder} units` : s.risk === "overstock" || s.risk === "dead_stock" ? "Promote or clear stock" : "Review stock level",
      evidence: [`available=${s.available}`, `daysOfCover=${s.daysOfCover ?? "n/a"}`, `reorderPoint=${s.reorderPoint}`],
      activation: "execution",
      score: severityScore(severity) + (s.daysOfCover !== null && s.daysOfCover < 3 ? 6 : 0),
    });
  }

  // Pricing → execution
  for (const s of pricing.signals) {
    const kind = s.recommendation === "promote" || s.recommendation === "discount" ? "promotion" : "price_optimization";
    const severity: Severity = s.marginPct < 0 ? "warning" : "opportunity";
    recs.push({
      id: `rec:${kind}:${s.productId}`,
      kind,
      scope: "product",
      refId: s.productId,
      severity,
      priority: priorityFor(severity),
      title: `${s.name}: ${s.recommendation} price`,
      detail: s.rationale,
      action: s.recommendation === "raise" ? "Increase price 3-5%" : s.recommendation === "promote" ? "Launch a targeted promotion" : "Apply a clearance discount",
      evidence: [`margin=${s.marginPct}%`, `revImpact=${s.expectedRevenueImpactPct}%`, `marginImpact=${s.expectedMarginImpactPct}%`],
      activation: "execution",
      score: severityScore(severity) + Math.abs(s.expectedRevenueImpactPct) + Math.abs(s.expectedMarginImpactPct),
    });
  }

  // Risks → governance (trust/seller) or execution/simulation
  for (const r of risks) {
    const activation = r.kind === "trust_risk" || r.kind === "seller_risk" ? "governance" : r.kind === "marketplace_risk" ? "simulation" : "execution";
    const kind = r.kind === "trust_risk" ? "trust_risk" : r.kind === "seller_risk" ? "seller_risk" : r.kind === "marketplace_risk" ? "marketplace_action" : r.kind === "inventory_risk" ? "stockout_risk" : "marketplace_action";
    recs.push({
      id: `rec:risk:${r.kind}:${r.refId}`,
      kind,
      scope: r.scope,
      refId: r.refId,
      severity: r.severity,
      priority: priorityFor(r.severity),
      title: r.title,
      detail: r.detail,
      action: r.recommendedAction,
      evidence: [r.kind],
      activation,
      score: severityScore(r.severity) + 4,
    });
  }

  // Growth → execution (initiatives), surges worth simulating → simulation
  for (const g of growth) {
    const activation = g.kind === "demand_surge" || g.kind === "category_expansion" ? "simulation" : "execution";
    recs.push({
      id: `rec:growth:${g.kind}:${g.refId}`,
      kind: "growth_opportunity",
      scope: g.scope,
      refId: g.refId,
      severity: "opportunity",
      priority: g.potential === "high" ? "high" : "medium",
      title: g.title,
      detail: g.detail,
      action: g.action,
      evidence: [`potential=${g.potential}`, g.kind],
      activation,
      score: severityScore("opportunity") + (g.potential === "high" ? 12 : g.potential === "medium" ? 6 : 0),
    });
  }

  // De-duplicate by id (keep highest score) and rank.
  const byId = new Map<string, IntelligenceRecommendation>();
  for (const rec of recs) {
    const existing = byId.get(rec.id);
    if (!existing || rec.score > existing.score) byId.set(rec.id, rec);
  }
  return [...byId.values()].sort((a, b) => b.score - a.score);
}
