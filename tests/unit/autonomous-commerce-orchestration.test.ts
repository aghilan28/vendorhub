import { describe, expect, it } from "vitest";
import { buildAutonomousCommerceOrchestration } from "@/lib/autonomous-commerce-orchestration";
import { ProductStatus } from "@/types";
import { createProduct, createVendor } from "../utils/fixtures";

const context = {
  locality: "Mylapore Temple Area",
  city: "Chennai",
  weather: "storm" as const,
  traffic: "heavy" as const,
  festival: "diwali" as const,
  dayType: "weekend" as const,
  festivalCongestion: true,
  now: new Date("2026-05-28T18:30:00+05:30"),
};

function orchestrationProducts() {
  const healthySeller = createVendor({
    id: "seller-healthy",
    name: "Healthy Mylapore Fresh",
    locality: context.locality,
    city: context.city,
    rating: 4.8,
    fulfillmentPromiseMinutes: 18,
  });
  const weakSeller = createVendor({
    id: "seller-collapse",
    name: "Collapsed Fish Stall",
    locality: context.locality,
    city: context.city,
    rating: 2.2,
    serviceStatus: "closed",
    fulfillmentPromiseMinutes: 95,
  });
  return [
    createProduct({
      id: "prod-flower-surge",
      name: "Fresh Diwali Pooja Flowers",
      slug: "fresh-diwali-pooja-flowers",
      vendor: healthySeller,
      category: { id: "cat-pooja", name: "Pooja Items", slug: "pooja-items" },
      tags: ["flower", "malligai", "diwali", "pooja"],
      price: 90,
      stockCount: 2,
      deliveryMinutes: 14,
    }),
    createProduct({
      id: "prod-fish-risk",
      name: "Fresh Seer Fish Pieces",
      slug: "fresh-seer-fish-risk",
      vendor: weakSeller,
      category: { id: "cat-fish", name: "Meat Seafood", slug: "meat-seafood" },
      tags: ["fish", "meen", "ultra fresh"],
      price: 440,
      stockCount: 1,
      status: ProductStatus.Active,
      deliveryMinutes: 36,
    }),
    createProduct({
      id: "prod-milk",
      name: "Aavin Milk 500ml",
      slug: "aavin-milk-500ml",
      vendor: healthySeller,
      category: { id: "cat-dairy", name: "Dairy", slug: "dairy" },
      tags: ["milk", "paal", "aavin"],
      price: 26,
      stockCount: 3,
      deliveryMinutes: 12,
    }),
  ];
}

describe("Tier 5 autonomous commerce orchestration", () => {
  it("handles locality imbalance with bounded rebalancing decisions", () => {
    const snapshot = buildAutonomousCommerceOrchestration({
      products: orchestrationProducts(),
      context,
    });

    expect(snapshot.localityBalancing.localityImbalanceScore).toBeGreaterThan(0);
    expect(snapshot.decisions.some((decision) => decision.actionType === "rebalance_inventory" || decision.actionType === "distress_clearance")).toBe(true);
    expect(snapshot.decisions.every((decision) => decision.reversible && decision.rollbackToken.startsWith("rollback:"))).toBe(true);
    expect(snapshot.decisions.every((decision) => decision.decision_id && decision.decision_type && decision.locality_scope)).toBe(true);
    expect(snapshot.decisions.every((decision) => decision.replay_safe && decision.rollback_supported)).toBe(true);
    expect(snapshot.decisions.every((decision) => decision.auditMetadata.unsafeActionsBlocked.includes("auto_ban_seller"))).toBe(true);
  });

  it("plans seller collapse recovery without destructive automation", () => {
    const snapshot = buildAutonomousCommerceOrchestration({
      products: orchestrationProducts(),
      context,
      outageSellerIds: ["seller-collapse"],
    });

    expect(snapshot.recovery.failureMode).toBe("seller_collapse");
    expect(snapshot.recovery.destructiveActionsBlocked).toBe(true);
    expect(snapshot.recovery.failoverSuggestions).toContain("Route demand to healthy nearby sellers.");
    expect(snapshot.recovery.rollbackPlan.length).toBeGreaterThan(0);
    expect(snapshot.recovery.approvalGates).toContain("critical-risk operator approval");
    expect(snapshot.decisions.some((decision) => decision.actionType === "containment" && decision.requiresApproval)).toBe(true);
  });

  it("adapts to demand surge and delivery congestion", () => {
    const snapshot = buildAutonomousCommerceOrchestration({
      products: orchestrationProducts(),
      context,
    });

    expect(snapshot.predictiveLocality.festivalSpikeProbability).toBeGreaterThan(0.7);
    expect(snapshot.predictiveLocality.trafficDisruptionRisk).toBeGreaterThan(0.7);
    expect(snapshot.routing.optimizedRoutingPlans.length).toBeGreaterThan(0);
    expect(snapshot.deliveryAdaptation.trafficRisk).toBeGreaterThan(0.7);
    expect(snapshot.deliveryAdaptation.festivalCongestionRisk).toBeGreaterThan(0.7);
    expect(snapshot.demandResponse.some((item) => item.includes("festival"))).toBe(true);
  });

  it("stabilizes marketplace pressure and allocates resources safely", () => {
    const snapshot = buildAutonomousCommerceOrchestration({
      products: orchestrationProducts(),
      context,
    });

    expect(snapshot.marketplaceHealth.marketplaceHealthScore).toBeGreaterThan(0);
    expect(snapshot.stabilization).toContain("Block irreversible autonomous mutations.");
    expect(snapshot.marketplacePressure.pressureAlerts.length).toBeGreaterThan(0);
    expect(snapshot.stabilizationPlan.reversible).toBe(true);
    expect(snapshot.rebalancing.locality_pressure_score).toBeGreaterThanOrEqual(0);
    expect(snapshot.resourceAllocation).toContain("Distribute search visibility across healthy sellers.");
    expect(snapshot.governance.operatorOverrideEnabled).toBe(true);
  });

  it("detects trust integrity risks and routes them to review", () => {
    const snapshot = buildAutonomousCommerceOrchestration({
      products: orchestrationProducts(),
      context,
      operations: undefined,
    });
    const weakSeller = snapshot.trustIntegrity.find((item) => item.sellerId === "seller-collapse");

    expect(weakSeller?.reviewRequired).toBe(true);
    expect(weakSeller?.trustScore).toBeLessThan(80);
    expect(snapshot.decisions.some((decision) => decision.actionType === "trust_review")).toBe(true);
    expect(snapshot.marketplaceIntegrity.automaticBansBlocked).toBe(true);
    expect(snapshot.marketplaceIntegrity.escalationRecommendations.some((item) => item.includes("do not auto-ban"))).toBe(true);
  });

  it("coordinates multi-agent actions with replay-safe async jobs and audits", () => {
    const snapshot = buildAutonomousCommerceOrchestration({
      products: orchestrationProducts(),
      context,
      telemetryGap: true,
    });

    expect(snapshot.agents).toHaveLength(8);
    expect(snapshot.agents.every((agent) => agent.bounded && agent.replaySafe)).toBe(true);
    expect(snapshot.agents.every((agent) => agent.confidence > 0 && agent.deterministicOutputKey.startsWith("agent:"))).toBe(true);
    expect(snapshot.agentCoordination.deterministic).toBe(true);
    expect(snapshot.agentCoordination.replaySafe).toBe(true);
    expect(snapshot.asyncJobs.map((job) => job.jobName)).toContain("tier5.orchestration.simulate");
    expect(snapshot.asyncJobs.every((job) => job.replaySafe && job.failoverEnabled && job.observable && job.queueIsolationKey)).toBe(true);
    expect(snapshot.governance.replayValidationKeys.length).toBe(snapshot.decisions.length);
    expect(snapshot.governance.approvalQueue.every((item) => item.rollbackToken.startsWith("rollback:"))).toBe(true);
    expect(snapshot.telemetry.replayValidationMetrics.replaySafe).toBe(snapshot.decisions.length);
    expect(snapshot.adaptiveLearning.every((event) => event.reversible && event.replayKey.startsWith("learn:"))).toBe(true);
  });

  it("produces explainable approval-aware decisions for every real-time commerce recommendation", () => {
    const snapshot = buildAutonomousCommerceOrchestration({
      products: orchestrationProducts(),
      context,
      outageSellerIds: ["seller-collapse"],
    });

    expect(snapshot.decisions.length).toBeGreaterThan(0);
    expect(
      snapshot.decisions.every(
        (decision) =>
          decision.explainability_report.why.length > 0 &&
          decision.explainability_report.sourceSignals.length > 0 &&
          decision.explainability_report.recoveryPath.length > 0 &&
          decision.explainability_report.rollbackPath.length > 0,
      ),
    ).toBe(true);
    expect(snapshot.decisions.filter((decision) => decision.risk_level === "high" || decision.risk_level === "critical").every((decision) => decision.approval_required)).toBe(true);
  });

  it("runs production simulations with bounded rollback-safe validation", () => {
    const snapshot = buildAutonomousCommerceOrchestration({
      products: orchestrationProducts(),
      context,
      telemetryGap: true,
    });

    expect(snapshot.simulations.map((simulation) => simulation.scenario)).toEqual([
      "locality_demand_surge",
      "seller_collapse",
      "fish_market_shortage",
      "delivery_saturation",
      "rain_disruption",
      "festival_congestion",
      "fake_scarcity_attack",
      "inventory_imbalance",
      "search_degradation",
      "multi_agent_conflict_resolution",
    ]);
    expect(snapshot.simulations.every((simulation) => simulation.boundedActions && simulation.replaySafe && simulation.rollbackSupported)).toBe(true);
    expect(snapshot.simulations.every((simulation) => simulation.operationalExplainability)).toBe(true);
  });
});
