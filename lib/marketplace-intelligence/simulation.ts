// MCP-0E.11 — Simulation Activation.
// Scenarios are projected on the LIVE marketplace fabric (real velocity, price,
// stock), not abstract demo state. Deterministic and unit-testable.

import type { MarketplaceFabric } from "./types";

export type MarketplaceScenarioKind =
  | "demand_surge"
  | "demand_drop"
  | "stockout_shock"
  | "price_change"
  | "promotion"
  | "growth_expansion";

export interface MarketplaceScenario {
  kind: MarketplaceScenarioKind;
  label: string;
  demandMultiplier: number;
  priceChangePct: number;
  horizonDays: number;
  category?: string;
}

export interface ScenarioOutcome {
  kind: MarketplaceScenarioKind;
  label: string;
  horizonDays: number;
  baseline: { units: number; revenue: number; stockouts: number };
  projected: { units: number; revenue: number; stockouts: number };
  deltas: { unitsPct: number; revenuePct: number; stockoutsDelta: number };
  risks: string[];
}

const DEFAULTS: Record<MarketplaceScenarioKind, { demandMultiplier: number; priceChangePct: number; label: string }> = {
  demand_surge: { demandMultiplier: 1.5, priceChangePct: 0, label: "Demand surge (+50%)" },
  demand_drop: { demandMultiplier: 0.6, priceChangePct: 0, label: "Demand drop (-40%)" },
  stockout_shock: { demandMultiplier: 2.0, priceChangePct: 0, label: "Demand shock (2x)" },
  price_change: { demandMultiplier: 1, priceChangePct: 5, label: "Price change (+5%)" },
  promotion: { demandMultiplier: 1.3, priceChangePct: -10, label: "Promotion (-10% price, +30% demand)" },
  growth_expansion: { demandMultiplier: 1.25, priceChangePct: 0, label: "Growth expansion (+25%)" },
};

function round(value: number, dp = 0) {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

function pct(from: number, to: number) {
  if (from === 0) return to === 0 ? 0 : 100;
  return round(((to - from) / from) * 100, 1);
}

export function buildScenario(kind: MarketplaceScenarioKind, overrides: Partial<MarketplaceScenario> = {}): MarketplaceScenario {
  const d = DEFAULTS[kind];
  return {
    kind,
    label: overrides.label ?? d.label,
    demandMultiplier: overrides.demandMultiplier ?? d.demandMultiplier,
    priceChangePct: overrides.priceChangePct ?? d.priceChangePct,
    horizonDays: overrides.horizonDays ?? 30,
    category: overrides.category,
  };
}

/** Projects a scenario forward on the live fabric. Simple bounded elasticity. */
export function runMarketplaceScenario(fabric: MarketplaceFabric, scenario: MarketplaceScenario): ScenarioOutcome {
  const horizon = scenario.horizonDays;
  const inScope = scenario.category ? fabric.products.filter((p) => p.category === scenario.category) : fabric.products;

  // Price elasticity: a price rise dampens units (−0.5 unit-% per +1 price-%).
  const elasticity = 1 - 0.5 * (scenario.priceChangePct / 100);
  const unitsFactor = Math.max(0, scenario.demandMultiplier * elasticity);
  const priceFactor = 1 + scenario.priceChangePct / 100;

  let baseUnits = 0;
  let baseRevenue = 0;
  let baseStockouts = 0;
  let projUnits = 0;
  let projRevenue = 0;
  let projStockouts = 0;

  for (const p of inScope) {
    const baseDemand = p.velocityPerDay * horizon;
    const projDemand = p.velocityPerDay * unitsFactor * horizon;
    baseUnits += baseDemand;
    projUnits += projDemand;
    baseRevenue += baseDemand * p.price;
    projRevenue += projDemand * p.price * priceFactor;
    if (p.velocityPerDay > 0 && p.available < baseDemand) baseStockouts += 1;
    if (p.velocityPerDay > 0 && p.available < projDemand) projStockouts += 1;
  }

  const baseline = { units: round(baseUnits), revenue: round(baseRevenue), stockouts: baseStockouts };
  const projected = { units: round(projUnits), revenue: round(projRevenue), stockouts: projStockouts };
  const deltas = {
    unitsPct: pct(baseline.units, projected.units),
    revenuePct: pct(baseline.revenue, projected.revenue),
    stockoutsDelta: projStockouts - baseStockouts,
  };

  const risks: string[] = [];
  if (deltas.stockoutsDelta > 0) risks.push(`${deltas.stockoutsDelta} additional stockouts within ${horizon} days — pre-position inventory.`);
  if (deltas.revenuePct < 0) risks.push(`Revenue declines ${Math.abs(deltas.revenuePct)}% under this scenario.`);
  if (scenario.priceChangePct < 0 && deltas.revenuePct < 5) risks.push("Promotion may not pay back in incremental revenue.");
  if (risks.length === 0) risks.push("No material risk detected at this horizon.");

  return { kind: scenario.kind, label: scenario.label, horizonDays: horizon, baseline, projected, deltas, risks };
}
