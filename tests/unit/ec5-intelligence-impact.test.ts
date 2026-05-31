/**
 * EC-5 — Commerce Intelligence Impact & Traceability Certification.
 * Proves (with executed evidence) that EXISTING intelligence influences behavior:
 *   recommendation → decision → execution initiative + action plan
 *   recommendation → governance signal + enforcement
 *   recommendation → simulation scenario + outcome on the live fabric
 * Plus operational + growth intelligence produce actionable, ranked output.
 * No new intelligence is built — this exercises the existing engines/connectors.
 */

import { describe, it, expect } from "vitest";
import {
  buildMarketplaceIntelligence,
  buildMarketplaceFabric,
  assembleRecommendations,
  analyzeDemand,
  analyzeInventory,
  analyzePricing,
  SAMPLE_MARKETPLACE_INPUT,
} from "@/lib/marketplace-intelligence";
import {
  activateToExecution,
  activateToGovernance,
  activateToSimulation,
  activateRecommendation,
  activateRecommendations,
  recommendationToDecision,
} from "@/lib/marketplace-intelligence/activation";
import type { IntelligenceRecommendation } from "@/lib/marketplace-intelligence/types";

function snapshot() {
  return buildMarketplaceIntelligence(SAMPLE_MARKETPLACE_INPUT);
}

describe("EC-5 Intelligence produces ranked, routed recommendations", () => {
  it("builds a full intelligence snapshot with recommendations", () => {
    const snap = snapshot();
    expect(snap.recommendations.length).toBeGreaterThan(0);
    // Each recommendation declares which activation layer it routes to
    for (const rec of snap.recommendations) {
      expect(["execution", "governance", "simulation"]).toContain(rec.activation);
      expect(["low", "medium", "high", "critical"]).toContain(rec.priority);
      expect(rec.action.length).toBeGreaterThan(0);
    }
  });

  it("recommendations are ranked by score (highest first)", () => {
    const recs = snapshot().recommendations;
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i].score).toBeLessThanOrEqual(recs[i - 1].score);
    }
  });
});

describe("EC-5 Traceability: recommendation → EXECUTION action", () => {
  it("converts a recommendation into a decision then a live initiative + action plan", () => {
    const recs = snapshot().recommendations;
    const rec = recs.find((r) => r.activation === "execution") ?? recs[0];

    // Stage 1: recommendation → decision (source = commerce, auditable)
    const decision = recommendationToDecision(rec, "2026-05-31T00:00:00.000Z");
    expect(decision.source).toBe("commerce");
    expect(decision.approvedBy).toBe("commerce-intelligence");
    expect(decision.title).toBe(rec.title);

    // Stage 2: decision → execution initiative + action plan
    const result = activateToExecution(rec, { ownerId: "own-1", now: "2026-05-31T00:00:00.000Z" });
    expect(result.activation).toBe("execution");
    expect(result.initiative).toBeTruthy();
    expect(result.initiative.id).toBeTruthy();
    expect(result.actionPlan).toBeTruthy();
    // The decision is linked to the initiative it activated (lineage)
    expect(result.decision.activatedInitiativeId).toBe(result.initiative.id);
    // Traceability: initiative carries the recommendation lineage
    expect(result.recommendationId).toBe(rec.id);
  });
});

describe("EC-5 Traceability: recommendation → GOVERNANCE action", () => {
  it("routes a trust/seller risk into a governance signal + enforcement", () => {
    // Synthesize a trust-risk recommendation shape the governance connector accepts
    const rec: IntelligenceRecommendation = {
      id: "rec-trust-1",
      kind: "trust_risk",
      scope: "store",
      refId: "seller-x",
      severity: "critical",
      priority: "critical",
      title: "Review manipulation suspected",
      detail: "Spike in unverified 5-star reviews",
      action: "Escalate to trust & safety",
      score: 88,
      evidence: ["unverified review spike"],
      activation: "governance",
    } as IntelligenceRecommendation;

    const gov = activateToGovernance(rec);
    expect(gov.activation).toBe("governance");
    expect(gov.signal.severity).toBe("critical");
    expect(gov.signal.score).toBe(88);
    expect(gov.enforcement).toBeTruthy();
    expect(typeof gov.reversible).toBe("boolean");
  });
});

describe("EC-5 Traceability: recommendation → SIMULATION outcome", () => {
  it("runs a scenario derived from a recommendation against the live fabric", () => {
    const fabric = buildMarketplaceFabric(SAMPLE_MARKETPLACE_INPUT);
    const rec: IntelligenceRecommendation = {
      id: "rec-growth-1",
      kind: "growth_opportunity",
      scope: "marketplace",
      refId: "marketplace",
      severity: "opportunity",
      priority: "high",
      title: "Demand surge expected",
      detail: "Festival demand uplift",
      action: "Pre-stock high-velocity SKUs",
      score: 70,
      evidence: ["festival demand curve"],
      activation: "simulation",
    } as IntelligenceRecommendation;

    const sim = activateToSimulation(rec, fabric);
    expect(sim.activation).toBe("simulation");
    expect(sim.scenario).toBeTruthy();
    expect(sim.outcome).toBeTruthy();
  });
});

describe("EC-5 Unified activation dispatch over a real recommendation set", () => {
  it("activates the top recommendations across all layers without error", () => {
    const snap = snapshot();
    const fabric = buildMarketplaceFabric(SAMPLE_MARKETPLACE_INPUT);
    const results = activateRecommendations(snap.recommendations, { fabric, limit: 12 });
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(["execution", "governance", "simulation"]).toContain(r.activation);
    }
  });

  it("dispatch routes each recommendation to its declared layer", () => {
    const snap = snapshot();
    const fabric = buildMarketplaceFabric(SAMPLE_MARKETPLACE_INPUT);
    for (const rec of snap.recommendations.slice(0, 8)) {
      const res = activateRecommendation(rec, { fabric });
      expect(res.activation).toBe(rec.activation);
    }
  });
});

describe("EC-5 Determinism (intelligence is reproducible/auditable)", () => {
  it("produces identical recommendations for identical input", () => {
    const a = snapshot().recommendations.map((r) => r.id);
    const b = snapshot().recommendations.map((r) => r.id);
    expect(a).toEqual(b);
  });
});

describe("EC-5 Seller intelligence dimensions are present + actionable", () => {
  it("demand / inventory / pricing analyses produce signals", () => {
    const fabric = buildMarketplaceFabric(SAMPLE_MARKETPLACE_INPUT);
    const demand = analyzeDemand(fabric);
    const inventory = analyzeInventory(fabric);
    const pricing = analyzePricing(fabric);
    expect(demand).toBeTruthy();
    expect(inventory).toBeTruthy();
    expect(pricing).toBeTruthy();
    // Recommendations assembled from these analyses carry concrete actions
    const risks = snapshot();
    const actionable = risks.recommendations.filter((r) => r.action && r.action.length > 0);
    expect(actionable.length).toBe(risks.recommendations.length);
  });
});
