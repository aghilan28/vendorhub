// KARTEX M6 — Canonical Intelligence Model.
// The connective spine that unifies Research, Knowledge, Simulation, SECIS, and
// Governance into one Commerce Intelligence Platform. Browser-safe, no imports.

export type ISODate = string;

// The five canonical stages of the intelligence lifecycle.
export type Stage = "research" | "knowledge" | "simulation" | "secis" | "governance";

export const STAGE_ORDER: Stage[] = ["research", "knowledge", "simulation", "secis", "governance"];

// A system that owns work. For research/knowledge the spine itself is the owner;
// for the others, the referenced operating system owns the underlying item.
export type System = Stage;

export type NodeStatus = "draft" | "active" | "in_review" | "approved" | "complete" | "blocked" | "archived";

// ── Canonical node ───────────────────────────────────────────────────────────
// A node in the cross-system lineage. Research/Knowledge nodes are owned by the
// platform; Simulation/SECIS/Governance nodes reference a real item by id+route.

export interface IntelligenceNode {
  id: string; // canonical id, e.g. "in_..."
  stage: Stage;
  system: System;
  title: string;
  summary: string;
  status: NodeStatus;
  ownerId: string;
  ownerName: string;
  tags: string[];
  refId?: string; // id of the underlying item in its system (sim/secis/gov)
  refRoute?: string; // deep link to the underlying item, e.g. "/simulations/sim_pricing"
  parentIds: string[]; // upstream lineage (canonical node ids)
  workflowId?: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

// ── Workflow (the continuous Research to Governance flow) ────────────────────

export type WorkflowStatus = "active" | "blocked" | "complete" | "archived";
export type StageStatus = "pending" | "in_progress" | "blocked" | "complete";

export interface WorkflowStageState {
  stage: Stage;
  status: StageStatus;
  nodeId?: string; // canonical node representing this stage
  system: System;
  refId?: string;
  refRoute?: string;
  label?: string;
  owner?: string;
  completedAt?: ISODate;
}

export interface IntelligenceWorkflow {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  ownerName: string;
  status: WorkflowStatus;
  stages: WorkflowStageState[];
  tags: string[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

// ── Provenance ───────────────────────────────────────────────────────────────

export type ProvenanceAction = "created" | "modified" | "published" | "executed" | "analyzed" | "reviewed" | "approved" | "governed" | "linked" | "advanced";

export interface ProvenanceEvent {
  id: string;
  workflowId?: string;
  nodeId?: string;
  stage: Stage;
  system: System;
  action: ProvenanceAction;
  actorId: string;
  actorName: string;
  summary: string;
  at: ISODate;
}

// ── Users / permissions ──────────────────────────────────────────────────────

export type PlatformRole = "orchestrator" | "contributor" | "viewer";

export interface PlatformUser {
  id: string;
  name: string;
  role: PlatformRole;
}

export type Permission = "workflow.manage" | "workflow.advance" | "node.create";

// ── Cross-system search (derived, not persisted) ─────────────────────────────

export interface SearchItem {
  id: string;
  system: System | "marketplace";
  type: string; // human label, e.g. "Decision", "Change event", "Simulation run"
  title: string;
  status: string;
  owner: string;
  date: ISODate;
  tags: string[];
  route: string;
}

// ── Unified activity / dashboard (derived) ───────────────────────────────────

export interface SystemActivity {
  stage: Stage;
  label: string;
  primary: number; // headline count
  primaryLabel: string;
  secondary: number;
  secondaryLabel: string;
  route: string;
}

export interface UnifiedAction {
  id: string;
  system: System;
  summary: string;
  actor: string;
  at: ISODate;
}

export interface PendingAction {
  id: string;
  system: System;
  title: string;
  detail: string;
  route: string;
}
