import { describe, it, expect } from "vitest";
import { computePriceProposal } from "@/lib/commerce-intelligence/pricing/engine";
import { proposePrice } from "@/lib/commerce-intelligence/pricing/service";
import { recordIntelligenceDecision } from "@/lib/commerce-intelligence/decision-log";
import { OPERATIONALIZATION } from "@/lib/commerce-intelligence/operations";

describe("pricing engine (deterministic)", () => {
  it("never proposes below the cost floor (margin protection)", () => {
    const p = computePriceProposal({
      productId: "p1",
      currentPriceMinor: 10000,
      costMinor: 9500,
      inventory: { spoilageRisk: 0.95, state: "distressed" },
    });
    expect(p.proposedPriceMinor).toBeGreaterThanOrEqual(9500);
    expect(p.strategy).toBe("distress");
  });

  it("applies distress markdown for expiring stock and is NOT auto-apply eligible", () => {
    const p = computePriceProposal({
      productId: "p2",
      currentPriceMinor: 10000,
      costMinor: 5000,
      inventory: { spoilageRisk: 0.8, state: "expiring" },
    });
    expect(p.proposedPriceMinor).toBeLessThan(10000);
    expect(p.autoApplyEligible).toBe(false); // distress always requires approval
  });

  it("bounds changes to the guardrail and flags a breach", () => {
    const p = computePriceProposal({
      productId: "p3",
      currentPriceMinor: 10000,
      costMinor: 1000,
      demand: { momentum: 5 },
      inventory: { state: "critical", daysOfCover: 0.5 },
      guardrailMaxChangePct: 10,
    });
    expect(p.proposedPriceMinor).toBeLessThanOrEqual(11000); // +10% guardrail
    expect(Math.abs(p.changePct)).toBeLessThanOrEqual(10.01);
  });

  it("small low-risk change can be auto-apply eligible", () => {
    const p = computePriceProposal({
      productId: "p4",
      currentPriceMinor: 10000,
      costMinor: 6000,
      demand: { momentum: 1.25 },
    });
    expect(p.changePct).toBeGreaterThan(0);
    expect(p.risk).toBe("low");
    expect(p.autoApplyEligible).toBe(true);
  });

  it("holds price when there is no signal", () => {
    const p = computePriceProposal({ productId: "p5", currentPriceMinor: 10000, costMinor: 6000 });
    expect(p.proposedPriceMinor).toBe(10000);
    expect(p.changePct).toBe(0);
  });
});

describe("pricing service (governed + audited)", () => {
  it("produces a proposal + records a decision (persistence is best-effort)", async () => {
    const out = await proposePrice({ productId: "p9", currentPriceMinor: 10000, costMinor: 6000, demand: { momentum: 1.3 } });
    expect(out.proposal.productId).toBe("p9");
    expect(out.decisionId).toBeTruthy();
    // No DB in unit env → not persisted, but proposal still returned (operational, not catastrophic).
    expect(typeof out.proposalId === "string" || out.proposalId === null).toBe(true);
  });
});

describe("decision ledger", () => {
  it("records a decision without throwing even when storage is unavailable", async () => {
    const rec = await recordIntelligenceDecision({
      domain: "forecasting",
      decisionType: "demand_forecast",
      decision: { predicted: 42 },
      confidence: 0.8,
    });
    expect(rec.id).toBeTruthy();
    expect(rec.domain).toBe("forecasting");
    expect(typeof rec.persisted).toBe("boolean");
  });
});

describe("operationalization map", () => {
  it("every domain has an owner and is marked operated", () => {
    for (const d of OPERATIONALIZATION) {
      expect(d.owner, `${d.domain} owner`).toBeTruthy();
      expect(d.storage && d.events && d.monitoring).toBe(true);
    }
  });
});
