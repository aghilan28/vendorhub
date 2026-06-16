import { describe, expect, it } from "vitest";
import {
  buildReport,
  can,
  canTransition,
  computeCompliance,
  controlCoverage,
  evaluateDecision,
  generateRecommendations,
  scoreRisk,
  type ComplianceCheck,
  type Decision,
  type GovernanceUser,
  type Policy,
} from "@/lib/governance-os";

function policy(partial: Partial<Policy> = {}): Policy {
  return {
    id: "p1",
    title: "Test policy",
    summary: "",
    category: "data",
    status: "published",
    version: 1,
    rules: [{ id: "r1", statement: "x", type: "mandatory", severityIfViolated: "high" }],
    ownerId: "u1",
    ownerName: "Owner",
    reviewerIds: [],
    approverIds: [],
    appliesToSystems: ["secis"],
    controlIds: ["c1"],
    tags: [],
    visibility: "team",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

function decision(partial: Partial<Decision> = {}): Decision {
  return {
    id: "d1",
    title: "Test decision",
    description: "",
    type: "operational",
    sourceSystem: "secis",
    ownerId: "u1",
    ownerName: "Owner",
    accountableId: "u2",
    accountableName: "Acc",
    reviewerIds: ["u3"],
    approverIds: ["u4"],
    status: "review",
    impact: "high",
    riskScore: 70,
    relatedPolicyIds: ["p1"],
    outcome: "pending",
    tags: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("governance risk scoring", () => {
  it("scores monotonically with severity and likelihood", () => {
    expect(scoreRisk("critical", "almost_certain")).toBeGreaterThan(scoreRisk("low", "rare"));
    expect(scoreRisk("high", "likely")).toBeGreaterThanOrEqual(scoreRisk("medium", "possible"));
    const s = scoreRisk("medium", "possible");
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });
});

describe("governance compliance", () => {
  const checks: ComplianceCheck[] = [
    { id: "1", title: "a", controlId: "c1", status: "pass", evidence: "", ownerId: "u", ownerName: "U", lastCheckedAt: "2026-01-01T00:00:00.000Z" },
    { id: "2", title: "b", controlId: "c1", status: "warning", evidence: "", ownerId: "u", ownerName: "U", lastCheckedAt: "2026-01-01T00:00:00.000Z" },
    { id: "3", title: "c", controlId: "c1", status: "fail", evidence: "", ownerId: "u", ownerName: "U", lastCheckedAt: "2026-01-01T00:00:00.000Z" },
    { id: "4", title: "d", controlId: "c1", status: "not_assessed", evidence: "", ownerId: "u", ownerName: "U", lastCheckedAt: "2026-01-01T00:00:00.000Z" },
  ];
  it("computes score and coverage", () => {
    const c = computeCompliance(checks);
    expect(c.total).toBe(4);
    expect(c.coverage).toBe(75); // 3 of 4 assessed
    expect(c.score).toBe(50); // (1 + 0.5) / 3
    expect(c.counts.fail).toBe(1);
  });
  it("computes control coverage across policies", () => {
    expect(controlCoverage([policy({ controlIds: ["c1"] }), policy({ id: "p2", controlIds: [] })])).toBe(50);
  });
});

describe("governance decision evaluation", () => {
  it("flags gaps when not ready and passes when complete", () => {
    const incomplete = evaluateDecision(decision({ reviewerIds: [] }), [policy()], [], 1);
    expect(incomplete.readyToApprove).toBe(false);
    expect(incomplete.gaps.length).toBeGreaterThan(0);

    const ready = evaluateDecision(decision(), [policy()], [{ id: "a1", decisionId: "d1", approverId: "u4", approverName: "A", approved: true, note: "", createdAt: "2026-01-01T00:00:00.000Z" }], 1);
    expect(ready.readyToApprove).toBe(true);
    expect(ready.readinessScore).toBe(100);
    expect(ready.applicablePolicies).toHaveLength(1);
  });

  it("requires two approvals when configured", () => {
    const one = [{ id: "a1", decisionId: "d1", approverId: "u4", approverName: "A", approved: true, note: "", createdAt: "2026-01-01T00:00:00.000Z" }];
    expect(evaluateDecision(decision(), [policy()], one, 2).readyToApprove).toBe(false);
  });
});

describe("governance workflow", () => {
  it("validates allowed transitions", () => {
    expect(canTransition("policy", "draft", "review")).toBe(true);
    expect(canTransition("policy", "draft", "published")).toBe(false);
    expect(canTransition("decision", "review", "approved")).toBe(true);
    expect(canTransition("decision", "approved", "draft")).toBe(false);
    expect(canTransition("exception", "requested", "review")).toBe(true);
  });
});

describe("governance recommendations + reports + RBAC", () => {
  it("generates recommendations for gaps", () => {
    const recs = generateRecommendations({
      policies: [policy({ approverIds: [], controlIds: [] })],
      decisions: [decision({ reviewerIds: [] })],
      risks: [],
      checks: [],
      exceptions: [],
    });
    expect(recs.length).toBeGreaterThan(0);
  });

  it("builds an exportable report", () => {
    const report = buildReport("policy", { policies: [policy()], decisions: [], risks: [], checks: [], controls: [], audit: [] });
    expect(report.kind).toBe("policy");
    expect(report.sections[0].rows.length).toBe(1);
    expect(report.metrics.length).toBeGreaterThan(0);
  });

  it("enforces role permissions", () => {
    const admin: GovernanceUser = { id: "1", name: "A", role: "governance_admin" };
    const viewer: GovernanceUser = { id: "2", name: "V", role: "viewer" };
    const approver: GovernanceUser = { id: "3", name: "Ap", role: "approver" };
    expect(can(admin, "settings.manage")).toBe(true);
    expect(can(viewer, "decision.approve")).toBe(false);
    expect(can(approver, "decision.approve")).toBe(true);
    expect(can(approver, "policy.manage")).toBe(false);
    expect(can(null, "policy.manage")).toBe(false);
  });
});
