import { describe, expect, it } from "vitest";
import {
  STAGE_ORDER,
  STAGE_META,
  can,
  lineageColumns,
  nextStage,
  prevStage,
  stageIndex,
  workflowProgress,
  type IntelligenceNode,
  type IntelligenceWorkflow,
  type PlatformUser,
  type Stage,
  type WorkflowStageState,
} from "@/lib/intelligence-platform";

describe("intelligence platform — canonical stages", () => {
  it("defines the five-stage lifecycle in order", () => {
    expect(STAGE_ORDER).toEqual(["research", "knowledge", "simulation", "secis", "governance"]);
    for (const stage of STAGE_ORDER) {
      expect(STAGE_META[stage].label.length).toBeGreaterThan(0);
      expect(STAGE_META[stage].route.length).toBeGreaterThan(0);
    }
  });

  it("navigates next/prev correctly", () => {
    expect(nextStage("research")).toBe("knowledge");
    expect(nextStage("governance")).toBeNull();
    expect(prevStage("research")).toBeNull();
    expect(prevStage("governance")).toBe("secis");
    expect(stageIndex("simulation")).toBe(2);
  });
});

function stage(stageName: Stage, status: WorkflowStageState["status"]): WorkflowStageState {
  return { stage: stageName, status, system: stageName };
}

function workflow(statuses: Array<WorkflowStageState["status"]>): IntelligenceWorkflow {
  return {
    id: "w1",
    name: "WF",
    description: "",
    ownerId: "u",
    ownerName: "U",
    status: "active",
    stages: STAGE_ORDER.map((s, i) => stage(s, statuses[i])),
    tags: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("intelligence platform — workflow progress", () => {
  it("computes completion and current stage", () => {
    const wf = workflow(["complete", "complete", "in_progress", "pending", "pending"]);
    const p = workflowProgress(wf);
    expect(p.total).toBe(5);
    expect(p.completed).toBe(2);
    expect(p.pct).toBe(40);
    expect(p.currentStage).toBe("simulation");
  });

  it("reports a fully complete workflow", () => {
    const p = workflowProgress(workflow(["complete", "complete", "complete", "complete", "complete"]));
    expect(p.pct).toBe(100);
    expect(p.currentStage).toBeNull();
  });
});

describe("intelligence platform — lineage", () => {
  it("groups nodes into ordered stage columns", () => {
    const nodes: IntelligenceNode[] = STAGE_ORDER.map((s, i) => ({
      id: `n${i}`,
      stage: s,
      system: s,
      title: s,
      summary: "",
      status: "complete",
      ownerId: "u",
      ownerName: "U",
      tags: [],
      parentIds: i > 0 ? [`n${i - 1}`] : [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }));
    const cols = lineageColumns(nodes);
    expect(cols).toHaveLength(5);
    expect(cols[0].stage).toBe("research");
    expect(cols[0].nodes).toHaveLength(1);
    expect(cols[4].stage).toBe("governance");
    // lineage chain: each node (except first) has a parent in the previous stage
    expect(nodes[4].parentIds).toEqual(["n3"]);
  });
});

describe("intelligence platform — RBAC", () => {
  it("enforces orchestration permissions", () => {
    const orchestrator: PlatformUser = { id: "1", name: "O", role: "orchestrator" };
    const contributor: PlatformUser = { id: "2", name: "C", role: "contributor" };
    const viewer: PlatformUser = { id: "3", name: "V", role: "viewer" };
    expect(can(orchestrator, "workflow.manage")).toBe(true);
    expect(can(contributor, "workflow.manage")).toBe(false);
    expect(can(contributor, "workflow.advance")).toBe(true);
    expect(can(viewer, "workflow.advance")).toBe(false);
    expect(can(null, "node.create")).toBe(false);
  });
});
