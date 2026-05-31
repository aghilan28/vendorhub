import { describe, expect, it } from "vitest";
import {
  activateRecommendation,
  activateRecommendations,
  activateToExecution,
  activateToGovernance,
  activateToSimulation,
  analyzeDemand,
  analyzeInventory,
  analyzePricing,
  buildMarketplaceIntelligence,
  buildBuyerIntelligence,
  buildScenario,
  computeMarketplaceHealth,
  detectGrowthOpportunities,
  detectMarketplaceRisks,
  runMarketplaceScenario,
  SAMPLE_MARKETPLACE_INPUT,
  WORKFLOW_DEFS,
  type IntelligenceRecommendation,
} from "@/lib/marketplace-intelligence";

const snapshot = buildMarketplaceIntelligence(SAMPLE_MARKETPLACE_INPUT);
const fabric = snapshot.fabric;

function recByRef(refId: string, kind?: IntelligenceRecommendation["kind"]) {
  return snapshot.recommendations.find((r) => r.refId === refId && (!kind || r.kind === kind));
}

describe("MCP-0E fabric", () => {
  it("normalizes real marketplace activity into an indexed fabric", () => {
    expect(fabric.windowDays).toBe(30);
    expect(fabric.products).toHaveLength(8);
    expect(fabric.stores).toHaveLength(3);
    expect(fabric.totals.gmv).toBeGreaterThan(0);
    expect(fabric.hasActivity).toBe(true);

    const tomatoes = fabric.products.find((p) => p.productId === "p1");
    expect(tomatoes?.velocityPerDay).toBe(5); // 150 units / 30 days
    expect(tomatoes?.daysOfCover).toBe(4); // 20 available / 5

    const speaker = fabric.products.find((p) => p.productId === "p8");
    expect(speaker?.available).toBe(0);
    expect(speaker?.velocityPerDay).toBeGreaterThan(0);

    const jeans = fabric.products.find((p) => p.productId === "p5");
    expect(jeans?.marginPct).toBeLessThan(0); // price 200 vs cost 240 (0.6 * 400)
  });

  it("computes real trust + fulfilment totals from activity", () => {
    expect(fabric.totals.flaggedReviews).toBe(2);
    expect(fabric.totals.openDisputes).toBe(2);
    const bargain = fabric.stores.find((s) => s.sellerId === "s2");
    expect(bargain?.cancellationRate).toBeGreaterThan(10);
    expect(bargain?.disputes).toBeGreaterThanOrEqual(1);
  });
});

describe("MCP-0E demand intelligence", () => {
  it("forecasts per product/category/store/marketplace and flags surges", () => {
    const demand = analyzeDemand(fabric);
    const scopes = new Set(demand.forecasts.map((f) => f.scope));
    expect(scopes.has("product")).toBe(true);
    expect(scopes.has("category")).toBe(true);
    expect(scopes.has("store")).toBe(true);
    expect(scopes.has("marketplace")).toBe(true);
    expect(demand.marketplaceForecast30d).toBeGreaterThan(0);

    const surge = demand.signals.find((s) => s.kind === "opportunity" && s.refId === "p1");
    expect(surge).toBeTruthy();
    const dead = demand.signals.find((s) => s.kind === "risk" && s.refId === "p3");
    expect(dead).toBeTruthy();
  });
});

describe("MCP-0E inventory intelligence", () => {
  it("detects stockout, overstock and dead stock with reorder math", () => {
    const inv = analyzeInventory(fabric);
    const speaker = inv.signals.find((s) => s.productId === "p8");
    expect(speaker?.risk).toBe("stockout");
    expect(speaker?.suggestedReorder).toBe(14); // ceil(1 * 14) - 0

    const spinach = inv.signals.find((s) => s.productId === "p3");
    expect(spinach?.risk).toBe("dead_stock");

    expect(inv.stockoutCount).toBeGreaterThanOrEqual(1);
    expect(inv.healthScore).toBeGreaterThanOrEqual(0);
    expect(inv.healthScore).toBeLessThanOrEqual(100);
  });
});

describe("MCP-0E pricing intelligence", () => {
  it("raises below-cost prices and finds headroom / clearance", () => {
    const pricing = analyzePricing(fabric);
    const jeans = pricing.signals.find((s) => s.productId === "p5");
    expect(jeans?.recommendation).toBe("raise"); // below cost
    const earbuds = pricing.signals.find((s) => s.productId === "p6");
    expect(earbuds?.recommendation).toBe("raise"); // healthy-margin headroom
    expect(pricing.belowMarginCount).toBeGreaterThanOrEqual(1);
    expect(pricing.averageMarginPct).toBeGreaterThan(0);
  });
});

describe("MCP-0E marketplace health/risk/growth", () => {
  it("scores health within bounds and detects risks + growth", () => {
    const demand = analyzeDemand(fabric);
    const inventory = analyzeInventory(fabric);
    const pricing = analyzePricing(fabric);
    const health = computeMarketplaceHealth(fabric, inventory, pricing);
    expect(health.score).toBeGreaterThanOrEqual(0);
    expect(health.score).toBeLessThanOrEqual(100);
    expect(["healthy", "watch", "degraded", "critical"]).toContain(health.tone);

    const risks = detectMarketplaceRisks(fabric, demand, inventory, pricing);
    const kinds = new Set(risks.map((r) => r.kind));
    expect(kinds.has("inventory_risk")).toBe(true);
    expect(kinds.has("seller_risk")).toBe(true);
    expect(kinds.has("trust_risk")).toBe(true);

    const growth = detectGrowthOpportunities(fabric, demand, pricing);
    expect(growth.some((g) => g.kind === "category_expansion")).toBe(true);
    expect(growth.some((g) => g.kind === "discovery_gap")).toBe(true);
  });
});

describe("MCP-0E recommendations + workflows", () => {
  it("assembles ranked recommendations routed to the right activation layer", () => {
    expect(snapshot.recommendations.length).toBeGreaterThan(0);
    // ranking is non-increasing
    for (let i = 1; i < snapshot.recommendations.length; i += 1) {
      expect(snapshot.recommendations[i - 1].score).toBeGreaterThanOrEqual(snapshot.recommendations[i].score);
    }
    expect(snapshot.recommendations.some((r) => r.activation === "execution")).toBe(true);
    expect(snapshot.recommendations.some((r) => r.activation === "governance")).toBe(true);
    expect(snapshot.recommendations.some((r) => r.activation === "simulation")).toBe(true);
  });

  it("builds six workflows that produce actions", () => {
    expect(snapshot.workflows).toHaveLength(WORKFLOW_DEFS.length);
    expect(WORKFLOW_DEFS).toHaveLength(6);
    const triggered = snapshot.workflows.filter((w) => w.triggered);
    expect(triggered.length).toBeGreaterThan(0);
    expect(triggered.every((w) => w.actions.length > 0)).toBe(true);
  });

  it("is deterministic", () => {
    const a = buildMarketplaceIntelligence(SAMPLE_MARKETPLACE_INPUT);
    const b = buildMarketplaceIntelligence(SAMPLE_MARKETPLACE_INPUT);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe("MCP-0E buyer intelligence", () => {
  it("produces trending, recommendations, availability and delivery predictions", () => {
    const buyer = buildBuyerIntelligence(fabric);
    expect(buyer.trending.length).toBeGreaterThan(0);
    expect(buyer.recommended.length).toBeGreaterThan(0);
    expect(buyer.deliveryPredictions.length).toBeGreaterThan(0);
    expect(buyer.availabilityPredictions.some((a) => a.prediction.includes("unavailable"))).toBe(true);
  });
});

describe("MCP-0E simulation on live fabric", () => {
  it("projects a demand surge forward and surfaces stockout risk", () => {
    const outcome = runMarketplaceScenario(fabric, buildScenario("demand_surge"));
    expect(outcome.projected.units).toBeGreaterThan(outcome.baseline.units);
    expect(outcome.deltas.stockoutsDelta).toBeGreaterThanOrEqual(0);

    const promo = runMarketplaceScenario(fabric, buildScenario("promotion"));
    expect(promo.projected.units).toBeGreaterThan(promo.baseline.units); // lower price + demand lift
  });
});

// ─────────────────────────── Mandatory User Journeys ───────────────────────────

describe("MCP-0E Journey A — activity → detection → recommendation → execution", () => {
  it("activates a recommendation into an execution initiative + action plan", () => {
    const rec = snapshot.recommendations.find((r) => r.activation === "execution");
    expect(rec).toBeTruthy();
    const result = activateToExecution(rec!, { ownerId: "own-amara", now: "2026-05-31T00:00:00.000Z" });
    expect(result.activation).toBe("execution");
    expect(result.initiative.id).toBeTruthy();
    expect(result.actionPlan.links[0].source).toBe("commerce");
    expect(result.decision.status).toBe("activated");
  });
});

describe("MCP-0E Journey B — demand surge → forecast → inventory alert → seller action", () => {
  it("links the surge product across demand, inventory and a recommendation", () => {
    const demand = analyzeDemand(fabric);
    expect(demand.signals.some((s) => s.refId === "p1" && s.kind === "opportunity")).toBe(true);
    const inv = analyzeInventory(fabric);
    expect(inv.signals.some((s) => s.productId === "p1")).toBe(true); // watch/low cover
    expect(recByRef("p1")).toBeTruthy();
  });
});

describe("MCP-0E Journey C — stockout risk → recommendation → approval → resolution", () => {
  it("turns the stockout into an approved, activated initiative", () => {
    const rec = recByRef("p8", "stockout_risk");
    expect(rec).toBeTruthy();
    expect(rec!.severity).toBe("critical");
    const result = activateToExecution(rec!);
    expect(result.decision.status).toBe("activated");
    expect(result.initiative.status).toBe("planned");
  });
});

describe("MCP-0E Journey D — trust risk → detection → governance → resolution", () => {
  it("routes a trust/seller risk to a governance signal + enforcement", () => {
    const rec = snapshot.recommendations.find((r) => r.activation === "governance");
    expect(rec).toBeTruthy();
    const gov = activateToGovernance(rec!);
    expect(gov.activation).toBe("governance");
    expect(gov.signal.type).toBeTruthy();
    expect(gov.enforcement).toBeTruthy();
    expect(typeof gov.reversible).toBe("boolean");
  });
});

describe("MCP-0E Journey E — admin insight → initiative → outcome", () => {
  it("exposes marketplace insights and activates growth into execution", () => {
    expect(snapshot.insights.length).toBeGreaterThan(0);
    expect(snapshot.health.score).toBeGreaterThanOrEqual(0);
    const growthRec = snapshot.recommendations.find((r) => r.kind === "growth_opportunity" && r.activation === "execution");
    expect(growthRec).toBeTruthy();
    const result = activateRecommendation(growthRec!, { fabric });
    expect(result.activation).toBe("execution");
  });
});

describe("MCP-0E activation dispatch", () => {
  it("dispatches every recommendation to a valid activation result", () => {
    const results = activateRecommendations(snapshot.recommendations, { fabric, limit: 20 });
    expect(results.length).toBeGreaterThan(0);
    for (const result of results) {
      expect(["execution", "governance", "simulation"]).toContain(result.activation);
    }
    // simulation activation runs on the live fabric
    const sim = snapshot.recommendations.find((r) => r.activation === "simulation");
    if (sim) {
      const out = activateToSimulation(sim, fabric);
      expect(out.outcome.horizonDays).toBeGreaterThan(0);
    }
    // recommendations are also de-duplicated by id
    const ids = snapshot.recommendations.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
