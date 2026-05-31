import { describe, expect, it } from "vitest";
import {
  ALLOWED_TRANSITIONS,
  EXECUTION_STATUSES,
  activateDecision,
  applyActivateDecision,
  applyAddIntervention,
  applyAssignOwner,
  applyCreateActionPlan,
  applyCreateInitiative,
  applyEscalationStatus,
  applyMeasureKpi,
  applyRecordOutcome,
  applyTransition,
  buildSeedDataset,
  canTransition,
  computeKpiAttainment,
  createActionPlan,
  evaluateKpiStatus,
  evaluateOutcomeStatus,
  getExecutionState,
  nextStates,
  transition,
} from "@/lib/execution";

const ACTOR = { id: "own-test", name: "Test Operator" };

describe("M8 execution workflow engine", () => {
  it("defines the mandatory seven-state lifecycle", () => {
    expect(EXECUTION_STATUSES).toEqual([
      "draft",
      "planned",
      "approved",
      "executing",
      "blocked",
      "completed",
      "archived",
    ]);
  });

  it("permits only legal transitions", () => {
    expect(canTransition("draft", "planned")).toBe(true);
    expect(canTransition("approved", "executing")).toBe(true);
    expect(canTransition("executing", "blocked")).toBe(true);
    expect(canTransition("blocked", "executing")).toBe(true);
    expect(canTransition("completed", "archived")).toBe(true);
  });

  it("rejects illegal transitions and self-transitions", () => {
    expect(canTransition("draft", "completed")).toBe(false);
    expect(canTransition("archived", "draft")).toBe(false);
    expect(canTransition("executing", "executing")).toBe(false);
    expect(nextStates("archived")).toEqual([]);
  });

  it("produces an audited event for valid transitions and none for invalid", () => {
    const ok = transition({
      entityType: "actionPlan",
      entityId: "ap-1",
      from: "approved",
      to: "executing",
      actorId: ACTOR.id,
      actorName: ACTOR.name,
    });
    expect(ok.ok).toBe(true);
    expect(ok.event?.type).toBe("transition");
    expect(ok.event?.fromStatus).toBe("approved");
    expect(ok.event?.toStatus).toBe("executing");

    const bad = transition({
      entityType: "actionPlan",
      entityId: "ap-1",
      from: "draft",
      to: "completed",
      actorId: ACTOR.id,
      actorName: ACTOR.name,
    });
    expect(bad.ok).toBe(false);
    expect(bad.event).toBeNull();
    expect(bad.error).toContain("Illegal");
  });

  it("keeps every transition target itself a valid status", () => {
    for (const targets of Object.values(ALLOWED_TRANSITIONS)) {
      for (const target of targets) {
        expect(EXECUTION_STATUSES).toContain(target);
      }
    }
  });
});

describe("M8 seed dataset integrity", () => {
  const data = buildSeedDataset();

  it("is deterministic across builds", () => {
    expect(buildSeedDataset()).toEqual(buildSeedDataset());
  });

  it("contains a complete, non-empty operational dataset", () => {
    expect(data.programs.length).toBeGreaterThanOrEqual(3);
    expect(data.initiatives.length).toBeGreaterThanOrEqual(5);
    expect(data.actionPlans.length).toBeGreaterThanOrEqual(5);
    expect(data.kpis.length).toBeGreaterThanOrEqual(5);
    expect(data.decisions.length).toBeGreaterThanOrEqual(5);
    expect(data.escalations.length).toBeGreaterThanOrEqual(1);
  });

  it("maintains referential integrity of initiative -> program links", () => {
    const programIds = new Set(data.programs.map((p) => p.id));
    for (const initiative of data.initiatives) {
      if (initiative.programId) {
        expect(programIds.has(initiative.programId)).toBe(true);
      }
    }
  });

  it("maintains referential integrity of action plan -> initiative links", () => {
    const initiativeIds = new Set(data.initiatives.map((i) => i.id));
    for (const plan of data.actionPlans) {
      if (plan.initiativeId) {
        expect(initiativeIds.has(plan.initiativeId)).toBe(true);
      }
    }
  });

  it("only links action plans to known owners", () => {
    const ownerIds = new Set(data.owners.map((o) => o.id));
    for (const plan of data.actionPlans) {
      if (plan.ownerId) expect(ownerIds.has(plan.ownerId)).toBe(true);
    }
  });
});

describe("M8 factory & scoring functions", () => {
  it("creates action plans in draft with zero progress", () => {
    const plan = createActionPlan({ title: "Test plan", now: "2026-05-30T00:00:00.000Z" });
    expect(plan.status).toBe("draft");
    expect(plan.progress).toBe(0);
    expect(plan.code.startsWith("AP-")).toBe(true);
  });

  it("computes KPI attainment respecting direction", () => {
    expect(computeKpiAttainment(80, 100, "increase")).toBeCloseTo(0.8);
    expect(computeKpiAttainment(50, 40, "decrease")).toBeCloseTo(0.8);
    expect(evaluateKpiStatus(100, 100, "increase")).toBe("on_track");
    expect(evaluateKpiStatus(85, 100, "increase")).toBe("at_risk");
    expect(evaluateKpiStatus(50, 100, "increase")).toBe("off_track");
  });

  it("evaluates outcome status from expected vs actual", () => {
    expect(evaluateOutcomeStatus(100, 100)).toBe("achieved");
    expect(evaluateOutcomeStatus(100, 80)).toBe("partial");
    expect(evaluateOutcomeStatus(100, 40)).toBe("missed");
    expect(evaluateOutcomeStatus(100, null)).toBe("pending");
  });

  it("activates a decision into a linked initiative and action plan", () => {
    const data = buildSeedDataset();
    const approved = data.decisions.find((d) => d.status === "approved");
    expect(approved).toBeDefined();
    const result = activateDecision(approved!, { ownerId: "own-sara" });
    expect(result.decision.status).toBe("activated");
    expect(result.initiative.decisionId).toBe(approved!.id);
    expect(result.initiative.actionPlanIds).toContain(result.actionPlan.id);
    expect(result.actionPlan.initiativeId).toBe(result.initiative.id);
    expect(result.actionPlan.links[0].refId).toBe(approved!.id);
  });
});

describe("M8 analytics snapshot", () => {
  const { snapshot } = getExecutionState("2026-05-30T09:00:00.000Z");

  it("computes a bounded health score and tone", () => {
    expect(snapshot.health.score).toBeGreaterThanOrEqual(0);
    expect(snapshot.health.score).toBeLessThanOrEqual(100);
    expect(["healthy", "watch", "degraded", "critical"]).toContain(snapshot.health.tone);
  });

  it("counts active portfolio entities", () => {
    expect(snapshot.counts.activeInitiatives).toBeGreaterThan(0);
    expect(snapshot.counts.openActions).toBeGreaterThan(0);
    expect(snapshot.counts.programs).toBeGreaterThanOrEqual(3);
  });

  it("summarises KPI and outcome performance with valid percentages", () => {
    expect(snapshot.kpis.total).toBeGreaterThan(0);
    expect(snapshot.kpis.onTrack + snapshot.kpis.atRisk + snapshot.kpis.offTrack).toBe(
      snapshot.kpis.total,
    );
    expect(snapshot.outcomes.successRate).toBeGreaterThanOrEqual(0);
    expect(snapshot.outcomes.successRate).toBeLessThanOrEqual(100);
  });

  it("is deterministic for a fixed generation timestamp", () => {
    const a = getExecutionState("2026-05-30T09:00:00.000Z").snapshot;
    const b = getExecutionState("2026-05-30T09:00:00.000Z").snapshot;
    expect(a).toEqual(b);
  });
});

describe("M8 mutations", () => {
  it("applies a valid transition and records an event", () => {
    const data = buildSeedDataset();
    const plan = data.actionPlans.find((a) => a.status === "approved")!;
    const result = applyTransition(data, {
      entityType: "actionPlan",
      entityId: plan.id,
      to: "executing",
      actor: ACTOR,
    });
    expect(result.ok).toBe(true);
    const updated = result.data.actionPlans.find((a) => a.id === plan.id)!;
    expect(updated.status).toBe("executing");
    expect(result.data.events[0].entityId).toBe(plan.id);
  });

  it("refuses an illegal transition without mutating state", () => {
    const data = buildSeedDataset();
    const draft = data.actionPlans.find((a) => a.status === "draft")!;
    const result = applyTransition(data, {
      entityType: "actionPlan",
      entityId: draft.id,
      to: "completed",
      actor: ACTOR,
    });
    expect(result.ok).toBe(false);
    expect(result.data).toBe(data);
  });

  it("marks progress complete on completion", () => {
    const data = buildSeedDataset();
    const plan = data.actionPlans.find((a) => a.status === "executing")!;
    const result = applyTransition(data, {
      entityType: "actionPlan",
      entityId: plan.id,
      to: "completed",
      actor: ACTOR,
    });
    expect(result.ok).toBe(true);
    expect(result.data.actionPlans.find((a) => a.id === plan.id)!.progress).toBe(100);
  });

  it("creates an action plan and links it to its initiative", () => {
    const data = buildSeedDataset();
    const result = applyCreateActionPlan(
      data,
      { title: "New plan", initiativeId: "ini-trust", now: "2026-05-30T00:00:00.000Z" },
      ACTOR,
    );
    expect(result.ok).toBe(true);
    const created = result.data.actionPlans[0];
    expect(created.title).toBe("New plan");
    expect(result.data.initiatives.find((i) => i.id === "ini-trust")!.actionPlanIds).toContain(
      created.id,
    );
  });

  it("creates an initiative and links it to its program", () => {
    const data = buildSeedDataset();
    const result = applyCreateInitiative(
      data,
      { name: "New initiative", programId: "prg-trust", now: "2026-05-30T00:00:00.000Z" },
      ACTOR,
    );
    expect(result.ok).toBe(true);
    const created = result.data.initiatives[0];
    expect(result.data.programs.find((p) => p.id === "prg-trust")!.initiativeIds).toContain(
      created.id,
    );
  });

  it("activates an approved decision and rejects pending / already-activated", () => {
    const data = buildSeedDataset();
    const approved = data.decisions.find((d) => d.status === "approved")!;
    const ok = applyActivateDecision(data, { decisionId: approved.id, ownerId: "own-sara" }, ACTOR);
    expect(ok.ok).toBe(true);
    expect(ok.data.decisions.find((d) => d.id === approved.id)!.status).toBe("activated");
    expect(ok.data.initiatives.some((i) => i.decisionId === approved.id)).toBe(true);

    const pending = data.decisions.find((d) => d.status === "pending")!;
    const blocked = applyActivateDecision(data, { decisionId: pending.id }, ACTOR);
    expect(blocked.ok).toBe(false);

    const already = applyActivateDecision(ok.data, { decisionId: approved.id }, ACTOR);
    expect(already.ok).toBe(false);
  });

  it("measures a KPI, updating value, trend and status", () => {
    const data = buildSeedDataset();
    const kpi = data.kpis.find((k) => k.id === "kpi-trust")!;
    const before = kpi.trend.length;
    const result = applyMeasureKpi(data, { kpiId: "kpi-trust", value: 0.9 }, ACTOR);
    expect(result.ok).toBe(true);
    const updated = result.data.kpis.find((k) => k.id === "kpi-trust")!;
    expect(updated.current).toBe(0.9);
    expect(updated.trend.length).toBe(before + 1);
    expect(updated.status).toBe("on_track");
  });

  it("records an outcome and recomputes status", () => {
    const data = buildSeedDataset();
    const result = applyRecordOutcome(data, { outcomeId: "out-catalog", actual: 12 }, ACTOR);
    expect(result.ok).toBe(true);
    const updated = result.data.outcomes.find((o) => o.id === "out-catalog")!;
    expect(updated.actual).toBe(12);
    expect(updated.status).toBe("achieved");
  });

  it("handles escalation status changes and interventions", () => {
    const data = buildSeedDataset();
    const escalation = data.escalations[0];
    const ack = applyEscalationStatus(data, { escalationId: escalation.id, status: "acknowledged" }, ACTOR);
    expect(ack.data.escalations.find((e) => e.id === escalation.id)!.status).toBe("acknowledged");

    const withIntervention = applyAddIntervention(
      ack.data,
      { escalationId: escalation.id, action: "Spin up task force", now: "2026-05-30T00:00:00.000Z" },
      ACTOR,
    );
    expect(withIntervention.ok).toBe(true);
    expect(withIntervention.data.interventions.some((i) => i.escalationId === escalation.id)).toBe(true);
    expect(
      withIntervention.data.escalations.find((e) => e.id === escalation.id)!.interventionIds.length,
    ).toBeGreaterThan(0);
  });

  it("assigns owners with validation", () => {
    const data = buildSeedDataset();
    const ok = applyAssignOwner(
      data,
      { entityType: "actionPlan", entityId: "ap-taxonomy", ownerId: "own-diego" },
      ACTOR,
    );
    expect(ok.ok).toBe(true);
    expect(ok.data.actionPlans.find((a) => a.id === "ap-taxonomy")!.ownerId).toBe("own-diego");

    const bad = applyAssignOwner(
      data,
      { entityType: "actionPlan", entityId: "ap-taxonomy", ownerId: "missing" },
      ACTOR,
    );
    expect(bad.ok).toBe(false);
  });
});
