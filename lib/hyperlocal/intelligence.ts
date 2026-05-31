// MCP-1C Phase 12 — Hyperlocal Intelligence (deterministic, pure).
//
// Operates on stores / zones / coverage cells to surface coverage gaps, demand
// hotspots, expansion opportunities, delivery + zone risks and territory
// opportunities, with ranked recommendations.

import type {
  CoverageCell,
  DeliveryNetworkSnapshot,
  HyperlocalIntelligence,
  HyperlocalRecommendation,
  HyperlocalRecommendationKind,
  Severity,
} from "./types";

function sev(severity: Severity): number {
  return { critical: 92, warning: 76, watch: 58, opportunity: 46, info: 30 }[severity];
}

function rec(
  kind: HyperlocalRecommendationKind,
  scope: HyperlocalRecommendation["scope"],
  refId: string,
  severity: Severity,
  title: string,
  detail: string,
  action: string,
): HyperlocalRecommendation {
  return { id: `hl-${kind}-${refId}`, kind, scope, refId, severity, title, detail, action, score: sev(severity) };
}

export interface CoverageCellInput {
  pincode: string;
  city?: string;
  stores: number;
  demand: number; // orders / interest proxy
}

function classifyCell(input: CoverageCellInput): CoverageCell["status"] {
  if (input.stores === 0 && input.demand > 0) return "gap";
  if (input.demand >= 50 && input.stores <= 1) return "hotspot";
  if (input.stores <= 1) return "thin";
  return "covered";
}

export function buildHyperlocalIntelligence(cellInputs: CoverageCellInput[], network?: DeliveryNetworkSnapshot): HyperlocalIntelligence {
  const cells: CoverageCell[] = cellInputs.map((input) => ({
    pincode: input.pincode,
    city: input.city,
    stores: input.stores,
    demand: input.demand,
    serviceable: input.stores > 0,
    status: classifyCell(input),
  }));

  const coverageGaps = cells.filter((c) => c.status === "gap").length;
  const demandHotspots = cells.filter((c) => c.status === "hotspot").length;
  const serviceablePincodes = cells.filter((c) => c.serviceable).length;
  const totalPincodes = cells.length;
  const coverageRate = totalPincodes ? Math.round((serviceablePincodes / totalPincodes) * 100) : 0;

  const recommendations: HyperlocalRecommendation[] = [];

  for (const cell of cells.filter((c) => c.status === "gap").sort((a, b) => b.demand - a.demand).slice(0, 5)) {
    recommendations.push(rec("coverage_gap", "zone", cell.pincode, "warning", `Coverage gap: ${cell.pincode}`, `${cell.demand} demand with no serviceable store in ${cell.city ?? cell.pincode}.`, "Recruit or extend a store's radius to cover this pincode."));
  }
  for (const cell of cells.filter((c) => c.status === "hotspot").sort((a, b) => b.demand - a.demand).slice(0, 5)) {
    recommendations.push(rec("demand_hotspot", "zone", cell.pincode, "opportunity", `Demand hotspot: ${cell.pincode}`, `High demand (${cell.demand}) with only ${cell.stores} store(s).`, "Add capacity or onboard sellers near this hotspot."));
  }
  for (const cell of cells.filter((c) => c.status === "thin").slice(0, 3)) {
    recommendations.push(rec("expansion", "zone", cell.pincode, "opportunity", `Thin coverage: ${cell.pincode}`, `${cell.stores} store(s) serving ${cell.city ?? cell.pincode}.`, "Expand selection to deepen local coverage."));
  }

  if (network) {
    for (const zone of network.zones.filter((z) => z.utilization >= 100)) {
      recommendations.push(rec("zone_risk", "zone", zone.id, "critical", `Zone overloaded: ${zone.name}`, `Utilization ${zone.utilization}% in ${zone.name}.`, "Add courier/store capacity or throttle promotions in this zone."));
    }
    for (const zone of network.zones.filter((z) => (z.onTimeRate ?? 100) < 80)) {
      recommendations.push(rec("delivery_risk", "zone", zone.id, "warning", `Delivery risk: ${zone.name}`, `On-time ${zone.onTimeRate}% in ${zone.name}.`, "Review courier performance and SLA enforcement for this zone."));
    }
  }

  return {
    cells: cells.sort((a, b) => b.demand - a.demand),
    recommendations: recommendations.sort((a, b) => b.score - a.score),
    coverageGaps,
    demandHotspots,
    serviceablePincodes,
    totalPincodes,
    coverageRate,
  };
}
