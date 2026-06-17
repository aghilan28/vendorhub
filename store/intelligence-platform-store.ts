"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  STAGE_META,
  STAGE_ORDER,
  nextStage,
  uid,
  type IntelligenceNode,
  type IntelligenceWorkflow,
  type NodeStatus,
  type PlatformUser,
  type ProvenanceAction,
  type ProvenanceEvent,
  type Stage,
  type StageStatus,
  type WorkflowStageState,
  type WorkflowStatus,
} from "@/lib/intelligence-platform";

function now(): string {
  return new Date().toISOString();
}
const SEED_BASE = Date.parse("2026-05-16T09:00:00.000Z");
function seedTime(min: number): string {
  return new Date(SEED_BASE + min * 60_000).toISOString();
}

const SEED_USERS: PlatformUser[] = [
  { id: "ip_anita", name: "Anita Desai", role: "orchestrator" },
  { id: "ip_rahul", name: "Rahul Menon", role: "contributor" },
  { id: "ip_sam", name: "Sam Iyer", role: "viewer" },
];

// ── Seed: three cross-system workflows wired to real seeded items ─────────────

function node(
  id: string,
  stage: Stage,
  title: string,
  summary: string,
  status: NodeStatus,
  ownerName: string,
  parentIds: string[],
  workflowId: string,
  createdMin: number,
  ref?: { refId?: string; refRoute?: string },
): IntelligenceNode {
  return { id, stage, system: stage, title, summary, status, ownerId: "ip_rahul", ownerName, tags: [], refId: ref?.refId, refRoute: ref?.refRoute, parentIds, workflowId, createdAt: seedTime(createdMin), updatedAt: seedTime(createdMin) };
}

interface SeedBundle {
  nodes: IntelligenceNode[];
  workflows: IntelligenceWorkflow[];
  provenance: ProvenanceEvent[];
}

function buildSeed(): SeedBundle {
  const nodes: IntelligenceNode[] = [];
  const workflows: IntelligenceWorkflow[] = [];
  const provenance: ProvenanceEvent[] = [];
  let pSeq = 0;
  const prov = (workflowId: string, nodeId: string, stage: Stage, action: ProvenanceAction, actorName: string, summary: string, min: number) => {
    pSeq += 1;
    provenance.push({ id: `prov-seed-${pSeq}`, workflowId, nodeId, stage, system: stage, action, actorId: "seed", actorName, summary, at: seedTime(min) });
  };

  // Workflow 1 — Festive Pricing Initiative (complete; links sim_pricing + dec-pricing)
  {
    const wf = "wf-pricing";
    const stageDefs: Array<{ stage: Stage; title: string; summary: string; status: NodeStatus; ref?: { refId?: string; refRoute?: string }; actor: string; action: ProvenanceAction; min: number }> = [
      { stage: "research", title: "Festive demand elasticity study", summary: "Investigated how festive demand responds to price changes.", status: "complete", actor: "Rahul Menon", action: "created", min: 0 },
      { stage: "knowledge", title: "Price elasticity model & playbook", summary: "Codified elasticity findings into a reusable pricing playbook.", status: "complete", actor: "Rahul Menon", action: "published", min: 20 },
      { stage: "simulation", title: "Festive Pricing Strategy", summary: "Swept price to find the profit-optimal festive price.", status: "complete", ref: { refId: "sim_pricing", refRoute: "/simulations/sim_pricing" }, actor: "Arjun Verma", action: "executed", min: 40 },
      { stage: "secis", title: "Festive price-change impact", summary: "Assessed downstream impact of the price move.", status: "complete", ref: { refRoute: "/secis/change-events?type=price_change" }, actor: "Priya Nair", action: "analyzed", min: 60 },
      { stage: "governance", title: "Adopt optimised festive price", summary: "Approved the festive repricing for a controlled experiment.", status: "approved", ref: { refId: "dec-pricing", refRoute: "/governance/decisions/dec-pricing" }, actor: "Vikram Rao", action: "governed", min: 80 },
    ];
    const stageStates: WorkflowStageState[] = [];
    let prevId: string | null = null;
    stageDefs.forEach((d) => {
      const id = `in_pricing_${d.stage}`;
      nodes.push(node(id, d.stage, d.title, d.summary, d.status, d.actor, prevId ? [prevId] : [], wf, d.min, d.ref));
      stageStates.push({ stage: d.stage, status: "complete", nodeId: id, system: d.stage, refId: d.ref?.refId, refRoute: d.ref?.refRoute, label: d.title, owner: d.actor, completedAt: seedTime(d.min + 5) });
      prov(wf, id, d.stage, d.action, d.actor, `${STAGE_META[d.stage].label}: ${d.title}`, d.min);
      prevId = id;
    });
    workflows.push({ id: wf, name: "Festive Pricing Initiative", description: "From elasticity research to a governed festive price.", ownerId: "ip_rahul", ownerName: "Rahul Menon", status: "complete", stages: stageStates, tags: ["pricing", "festive"], createdAt: seedTime(0), updatedAt: seedTime(85) });
  }

  // Workflow 2 — Dairy Supply Resilience (complete; links ce-supplier + dec-backup)
  {
    const wf = "wf-dairy";
    const stageDefs: Array<{ stage: Stage; title: string; summary: string; status: NodeStatus; ref?: { refId?: string; refRoute?: string }; actor: string; action: ProvenanceAction; min: number }> = [
      { stage: "research", title: "Supplier concentration risk study", summary: "Studied dependency on the Anand Dairy co-op.", status: "complete", actor: "Rahul Menon", action: "created", min: 100 },
      { stage: "knowledge", title: "Supply resilience playbook", summary: "Codified backup-supplier and safety-stock strategies.", status: "complete", actor: "Rahul Menon", action: "published", min: 120 },
      { stage: "simulation", title: "Supply disruption simulation", summary: "Modelled the effect of a supply disruption.", status: "complete", ref: { refRoute: "/simulations" }, actor: "Arjun Verma", action: "executed", min: 140 },
      { stage: "secis", title: "Anand Dairy supply outage", summary: "Propagated the dairy outage across the dependency graph.", status: "complete", ref: { refId: "ce-supplier", refRoute: "/secis/ce-supplier" }, actor: "Priya Nair", action: "analyzed", min: 160 },
      { stage: "governance", title: "Activate backup supplier for dairy outage", summary: "Approved the backup-supplier response.", status: "approved", ref: { refId: "dec-backup", refRoute: "/governance/decisions/dec-backup" }, actor: "Vikram Rao", action: "governed", min: 180 },
    ];
    const stageStates: WorkflowStageState[] = [];
    let prevId: string | null = null;
    stageDefs.forEach((d) => {
      const id = `in_dairy_${d.stage}`;
      nodes.push(node(id, d.stage, d.title, d.summary, d.status, d.actor, prevId ? [prevId] : [], wf, d.min, d.ref));
      stageStates.push({ stage: d.stage, status: "complete", nodeId: id, system: d.stage, refId: d.ref?.refId, refRoute: d.ref?.refRoute, label: d.title, owner: d.actor, completedAt: seedTime(d.min + 5) });
      prov(wf, id, d.stage, d.action, d.actor, `${STAGE_META[d.stage].label}: ${d.title}`, d.min);
      prevId = id;
    });
    workflows.push({ id: wf, name: "Dairy Supply Resilience", description: "From supplier-risk research to a governed mitigation.", ownerId: "ip_rahul", ownerName: "Rahul Menon", status: "complete", stages: stageStates, tags: ["supply", "resilience"], createdAt: seedTime(100), updatedAt: seedTime(185) });
  }

  // Workflow 3 — Q3 Launch Readiness (active; sim_launch complete, secis in progress, governance pending)
  {
    const wf = "wf-launch";
    const defs: Array<{ stage: Stage; title: string; summary: string; status: NodeStatus; stageStatus: WorkflowStageState["status"]; ref?: { refId?: string; refRoute?: string }; actor: string; action?: ProvenanceAction; min: number }> = [
      { stage: "research", title: "Hyperlocal onboarding research", summary: "Researched vendor onboarding friction in Chennai.", status: "complete", stageStatus: "complete", actor: "Rahul Menon", action: "created", min: 200 },
      { stage: "knowledge", title: "Vendor onboarding playbook", summary: "Playbook for onboarding new hyperlocal vendors.", status: "complete", stageStatus: "complete", actor: "Rahul Menon", action: "published", min: 220 },
      { stage: "simulation", title: "Q3 Vendor Onboarding Launch", summary: "Adoption forecast for the onboarding campaign.", status: "complete", stageStatus: "complete", ref: { refId: "sim_launch", refRoute: "/simulations/sim_launch" }, actor: "Arjun Verma", action: "executed", min: 240 },
      { stage: "secis", title: "Analyse launch demand-surge impact", summary: "Assess the impact of the launch demand surge.", status: "active", stageStatus: "in_progress", ref: { refRoute: "/secis/change-events?type=demand_surge" }, actor: "Priya Nair", min: 260 },
      { stage: "governance", title: "Approve launch plan", summary: "Governance approval of the launch plan.", status: "draft", stageStatus: "pending", ref: { refRoute: "/governance/decisions?new=1&source=secis" }, actor: "Vikram Rao", min: 280 },
    ];
    const stageStates: WorkflowStageState[] = [];
    let prevId: string | null = null;
    defs.forEach((d) => {
      const id = `in_launch_${d.stage}`;
      nodes.push(node(id, d.stage, d.title, d.summary, d.status, d.actor, prevId ? [prevId] : [], wf, d.min, d.ref));
      stageStates.push({ stage: d.stage, status: d.stageStatus, nodeId: id, system: d.stage, refId: d.ref?.refId, refRoute: d.ref?.refRoute, label: d.title, owner: d.actor, completedAt: d.stageStatus === "complete" ? seedTime(d.min + 5) : undefined });
      if (d.action) prov(wf, id, d.stage, d.action, d.actor, `${STAGE_META[d.stage].label}: ${d.title}`, d.min);
      prevId = id;
    });
    workflows.push({ id: wf, name: "Q3 Launch Readiness", description: "From onboarding research toward a governed launch.", ownerId: "ip_rahul", ownerName: "Rahul Menon", status: "active", stages: stageStates, tags: ["launch", "q3"], createdAt: seedTime(200), updatedAt: seedTime(265) });
  }

  return { nodes, workflows, provenance };
}

const SEED = buildSeed();

// ── Store ──────────────────────────────────────────────────────────────────

export interface CreateWorkflowInput {
  name: string;
  description: string;
  tags?: string[];
}

interface IntelligenceState {
  users: PlatformUser[];
  currentUserId: string;
  nodes: IntelligenceNode[];
  workflows: IntelligenceWorkflow[];
  provenance: ProvenanceEvent[];

  setCurrentUser: (id: string) => void;
  createWorkflow: (input: CreateWorkflowInput) => string;
  advanceWorkflow: (workflowId: string) => void;
  linkStage: (workflowId: string, stage: Stage, refId: string | undefined, refRoute: string, label: string) => void;
  blockStage: (workflowId: string, stage: Stage, blocked: boolean) => void;
  archiveWorkflow: (workflowId: string) => void;
  resetToSeed: () => void;
}

function currentUser(s: IntelligenceState): PlatformUser {
  return s.users.find((u) => u.id === s.currentUserId) ?? s.users[0];
}

function provEvent(s: IntelligenceState, workflowId: string, nodeId: string | undefined, stage: Stage, action: ProvenanceAction, summary: string): ProvenanceEvent {
  const u = currentUser(s);
  return { id: uid("prov"), workflowId, nodeId, stage, system: stage, action, actorId: u.id, actorName: u.name, summary, at: now() };
}

export const useIntelligenceStore = create<IntelligenceState>()(
  persist(
    (set, get) => ({
      users: SEED_USERS,
      currentUserId: "ip_anita",
      nodes: SEED.nodes,
      workflows: SEED.workflows,
      provenance: SEED.provenance,

      setCurrentUser: (id) => set({ currentUserId: id }),

      createWorkflow: (input) => {
        const id = uid("wf");
        const u = currentUser(get());
        const researchNodeId = uid("in");
        const researchNode: IntelligenceNode = {
          id: researchNodeId,
          stage: "research",
          system: "research",
          title: `${input.name} — research`,
          summary: input.description || "Initial research stage.",
          status: "active",
          ownerId: u.id,
          ownerName: u.name,
          tags: input.tags ?? [],
          parentIds: [],
          workflowId: id,
          createdAt: now(),
          updatedAt: now(),
        };
        const stages: WorkflowStageState[] = STAGE_ORDER.map((stage) => ({
          stage,
          status: stage === "research" ? "in_progress" : "pending",
          nodeId: stage === "research" ? researchNodeId : undefined,
          system: stage,
          refRoute: STAGE_META[stage].route,
          label: stage === "research" ? researchNode.title : STAGE_META[stage].label,
          owner: stage === "research" ? u.name : undefined,
        }));
        const wf: IntelligenceWorkflow = { id, name: input.name, description: input.description, ownerId: u.id, ownerName: u.name, status: "active", stages, tags: input.tags ?? [], createdAt: now(), updatedAt: now() };
        set((s) => ({ workflows: [wf, ...s.workflows], nodes: [researchNode, ...s.nodes], provenance: [provEvent(s, id, researchNodeId, "research", "created", `Created workflow '${input.name}'`), ...s.provenance] }));
        return id;
      },

      advanceWorkflow: (workflowId) =>
        set((s) => {
          const wf = s.workflows.find((w) => w.id === workflowId);
          if (!wf || wf.status === "complete" || wf.status === "archived") return {};
          const u = currentUser(s);
          const idx = wf.stages.findIndex((st) => st.status === "in_progress");
          if (idx === -1) return {};
          const stages = wf.stages.map((st) => ({ ...st }));
          const newProvenance: ProvenanceEvent[] = [];
          const newNodes: IntelligenceNode[] = [];

          // complete current
          stages[idx] = { ...stages[idx], status: "complete", completedAt: now() };
          if (stages[idx].nodeId) newProvenance.push(provEvent(s, workflowId, stages[idx].nodeId, stages[idx].stage, "advanced", `Completed ${STAGE_META[stages[idx].stage].label} stage`));

          let status: IntelligenceWorkflow["status"] = "active";
          if (idx + 1 < stages.length) {
            const next = stages[idx + 1];
            const nodeId = uid("in");
            const newNode: IntelligenceNode = {
              id: nodeId,
              stage: next.stage,
              system: next.stage,
              title: next.label ?? STAGE_META[next.stage].label,
              summary: `${STAGE_META[next.stage].label} stage of '${wf.name}'.`,
              status: "active",
              ownerId: u.id,
              ownerName: u.name,
              tags: wf.tags,
              refRoute: next.refRoute,
              parentIds: stages[idx].nodeId ? [stages[idx].nodeId as string] : [],
              workflowId,
              createdAt: now(),
              updatedAt: now(),
            };
            newNodes.push(newNode);
            stages[idx + 1] = { ...next, status: "in_progress", nodeId, owner: u.name };
            newProvenance.push(provEvent(s, workflowId, nodeId, next.stage, "advanced", `Advanced to ${STAGE_META[next.stage].label} stage`));
          } else {
            status = "complete";
          }

          return {
            workflows: s.workflows.map((w) => (w.id === workflowId ? { ...w, stages, status, updatedAt: now() } : w)),
            nodes: [...newNodes, ...s.nodes],
            provenance: [...newProvenance, ...s.provenance],
          };
        }),

      linkStage: (workflowId, stage, refId, refRoute, label) =>
        set((s) => {
          const wf = s.workflows.find((w) => w.id === workflowId);
          if (!wf) return {};
          const stages = wf.stages.map((st) => (st.stage === stage ? { ...st, refId, refRoute, label } : st));
          const targetNodeId = wf.stages.find((st) => st.stage === stage)?.nodeId;
          return {
            workflows: s.workflows.map((w) => (w.id === workflowId ? { ...w, stages, updatedAt: now() } : w)),
            nodes: s.nodes.map((n) => (n.id === targetNodeId ? { ...n, refId, refRoute, title: label, updatedAt: now() } : n)),
            provenance: [provEvent(s, workflowId, targetNodeId, stage, "linked", `Linked ${STAGE_META[stage].label} to ${label}`), ...s.provenance],
          };
        }),

      blockStage: (workflowId, stage, blocked) =>
        set((s) => {
          const wf = s.workflows.find((w) => w.id === workflowId);
          if (!wf) return {};
          const stages = wf.stages.map((st) => (st.stage === stage ? { ...st, status: (blocked ? "blocked" : "in_progress") as StageStatus } : st));
          return { workflows: s.workflows.map((w) => (w.id === workflowId ? { ...w, stages, status: (blocked ? "blocked" : "active") as WorkflowStatus, updatedAt: now() } : w)) };
        }),

      archiveWorkflow: (workflowId) =>
        set((s) => ({ workflows: s.workflows.map((w) => (w.id === workflowId ? { ...w, status: "archived", updatedAt: now() } : w)) })),

      resetToSeed: () => {
        const seed = buildSeed();
        set({ nodes: seed.nodes, workflows: seed.workflows, provenance: seed.provenance });
      },
    }),
    { name: "vendorhub-intelligence-platform", version: 1 },
  ),
);

export { nextStage };
