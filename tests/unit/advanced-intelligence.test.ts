import { describe, it, expect } from "vitest";
import { evaluateRule, evaluatePolicies } from "@/lib/advanced-intelligence/governance";
import { evaluateKnowledgeValidation } from "@/lib/advanced-intelligence/knowledge";
import { runSimulation } from "@/lib/advanced-intelligence/simulation";
import { recordAdvancedDecision } from "@/lib/advanced-intelligence/decision-log";
import { ADVANCED_OPERATIONALIZATION } from "@/lib/advanced-intelligence/operations";
import type { GovernancePolicy } from "@/lib/advanced-intelligence/types";

describe("governance rule engine (pure)", () => {
  it("evaluates allOf / anyOf / none conditions", () => {
    expect(evaluateRule({ allOf: [{ field: "amount", op: "lte", value: 100 }] }, { amount: 50 }).passed).toBe(true);
    expect(evaluateRule({ allOf: [{ field: "amount", op: "lte", value: 100 }] }, { amount: 150 }).passed).toBe(false);
    expect(evaluateRule({ anyOf: [{ field: "role", op: "eq", value: "admin" }, { field: "role", op: "eq", value: "owner" }] }, { role: "owner" }).passed).toBe(true);
    expect(evaluateRule({ none: [{ field: "blocked", op: "truthy" }] }, { blocked: true }).passed).toBe(false);
    expect(evaluateRule({ allOf: [{ field: "kyc.verified", op: "truthy" }] }, { kyc: { verified: true } }).passed).toBe(true);
  });

  const policies: GovernancePolicy[] = [
    { policyKey: "amount_cap", title: "Amount cap", severity: "high", rule: { allOf: [{ field: "amount", op: "lte", value: 1000 }] } },
    { policyKey: "no_sanctioned", title: "No sanctioned party", severity: "critical", rule: { none: [{ field: "sanctioned", op: "truthy" }] } },
  ];

  it("rejects on failed critical policy", () => {
    const e = evaluatePolicies(policies, { amount: 10, sanctioned: true });
    expect(e.outcome).toBe("rejected");
    expect(e.failedCritical).toContain("no_sanctioned");
  });

  it("escalates on failed high policy", () => {
    const e = evaluatePolicies(policies, { amount: 5000, sanctioned: false });
    expect(e.outcome).toBe("escalated");
    expect(e.failedHigh).toContain("amount_cap");
  });

  it("approves when all policies pass", () => {
    expect(evaluatePolicies(policies, { amount: 10, sanctioned: false }).outcome).toBe("approved");
  });
});

describe("knowledge validation gate (epistemic security invariant)", () => {
  it("quarantines a claim with no supporting evidence", () => {
    expect(evaluateKnowledgeValidation({ kind: "claim", derivedFrom: [] }).state).toBe("quarantined");
  });
  it("verifies a well-supported claim", () => {
    expect(evaluateKnowledgeValidation({ kind: "claim", derivedFrom: ["e1", "e2"], qualityScore: 0.9 }).state).toBe("verified");
  });
  it("holds a weakly-supported claim for verification", () => {
    expect(evaluateKnowledgeValidation({ kind: "claim", derivedFrom: ["e1"], qualityScore: 0.2 }).state).toBe("verifying");
  });
  it("accepts evidence units directly", () => {
    expect(evaluateKnowledgeValidation({ kind: "evidence" }).state).toBe("verified");
  });
});

describe("simulation runtime (stateful + audited wrapper)", () => {
  it("runs injected compute, records duration + decision", async () => {
    const out = await runSimulation("bass_diffusion", { p: 0.03, q: 0.38 }, () => ({ adoption: [0.1, 0.3, 0.6] }));
    expect(out.status).toBe("completed");
    expect(out.outputs).toEqual({ adoption: [0.1, 0.3, 0.6] });
    expect(out.decisionId).toBeTruthy();
    expect(out.durationMs).toBeGreaterThanOrEqual(0);
  });
  it("marks a failing simulation as failed without throwing", async () => {
    const out = await runSimulation("strategic_competition", {}, () => {
      throw new Error("diverged");
    });
    expect(out.status).toBe("failed");
    expect(out.outputs).toBeNull();
  });
});

describe("advanced decision ledger", () => {
  it("records without throwing even when storage is unavailable", async () => {
    const rec = await recordAdvancedDecision({ domain: "governance", decisionType: "policy_evaluation", decision: { outcome: "approved" } });
    expect(rec.id).toBeTruthy();
    expect(typeof rec.persisted).toBe("boolean");
  });
});

describe("operationalization map", () => {
  it("every advanced domain has an owner and core operational primitives", () => {
    for (const d of ADVANCED_OPERATIONALIZATION) {
      expect(d.owner, `${d.domain} owner`).toBeTruthy();
      expect(d.storage && d.events && d.monitoring).toBe(true);
    }
  });
});
