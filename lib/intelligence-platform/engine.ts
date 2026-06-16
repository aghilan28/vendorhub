// KARTEX M6 — Intelligence Orchestration Engine.
// Pure helpers for the canonical model: stage metadata, lineage layout,
// workflow progress, and downstream-trigger sequencing.

import { STAGE_ORDER, type IntelligenceNode, type IntelligenceWorkflow, type Stage } from "./types";

export interface StageMeta {
  stage: Stage;
  label: string;
  short: string;
  color: string;
  route: string; // where this stage's work happens
  description: string;
}

export const STAGE_META: Record<Stage, StageMeta> = {
  research: { stage: "research", label: "Research", short: "R", color: "#7c3aed", route: "/intelligence/workflows", description: "Investigate a question and produce findings." },
  knowledge: { stage: "knowledge", label: "Knowledge", short: "K", color: "#2563eb", route: "/intelligence/workflows", description: "Codify findings into reusable knowledge." },
  simulation: { stage: "simulation", label: "Simulation", short: "S", color: "#059669", route: "/simulations", description: "Model outcomes with the Simulation OS." },
  secis: { stage: "secis", label: "Impact (SECIS)", short: "I", color: "#f59e0b", route: "/secis", description: "Analyse change impact with SECIS." },
  governance: { stage: "governance", label: "Governance", short: "G", color: "#e11d48", route: "/governance", description: "Decide, approve, and govern." },
};

export function stageIndex(stage: Stage): number {
  return STAGE_ORDER.indexOf(stage);
}

export function nextStage(stage: Stage): Stage | null {
  const i = stageIndex(stage);
  return i >= 0 && i < STAGE_ORDER.length - 1 ? STAGE_ORDER[i + 1] : null;
}

export function prevStage(stage: Stage): Stage | null {
  const i = stageIndex(stage);
  return i > 0 ? STAGE_ORDER[i - 1] : null;
}

export interface WorkflowProgress {
  completed: number;
  total: number;
  pct: number;
  currentStage: Stage | null;
  currentIndex: number;
}

export function workflowProgress(workflow: IntelligenceWorkflow): WorkflowProgress {
  const total = workflow.stages.length;
  const completed = workflow.stages.filter((s) => s.status === "complete").length;
  const current = workflow.stages.find((s) => s.status === "in_progress" || s.status === "blocked") ?? workflow.stages.find((s) => s.status === "pending");
  return {
    completed,
    total,
    pct: total ? Math.round((completed / total) * 100) : 0,
    currentStage: current?.stage ?? null,
    currentIndex: current ? stageIndex(current.stage) : total,
  };
}

// Group canonical nodes into ordered stage columns for the lineage graph.
export function lineageColumns(nodes: IntelligenceNode[]): Array<{ stage: Stage; nodes: IntelligenceNode[] }> {
  return STAGE_ORDER.map((stage) => ({ stage, nodes: nodes.filter((n) => n.stage === stage) }));
}

// Formatters
export function relativeTime(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(then).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string): string {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? "" : new Date(t).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

let seq = 0;
export function uid(prefix: string): string {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}${seq.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}
