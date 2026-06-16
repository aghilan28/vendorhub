import type { NodeStatus, ProvenanceAction, StageStatus, WorkflowStatus } from "@/lib/intelligence-platform";

export type BadgeVariant = "default" | "secondary" | "warning" | "danger" | "ai";

export function workflowStatusVariant(s: WorkflowStatus): BadgeVariant {
  return s === "complete" ? "default" : s === "blocked" ? "danger" : s === "archived" ? "secondary" : "ai";
}

export function stageStatusVariant(s: StageStatus): BadgeVariant {
  return s === "complete" ? "default" : s === "blocked" ? "danger" : s === "in_progress" ? "ai" : "secondary";
}

export function nodeStatusVariant(s: NodeStatus): BadgeVariant {
  return s === "complete" || s === "approved" ? "default" : s === "blocked" ? "danger" : s === "in_review" ? "warning" : s === "archived" ? "secondary" : "ai";
}

export const PROVENANCE_LABELS: Record<ProvenanceAction, string> = {
  created: "Created",
  modified: "Modified",
  published: "Published",
  executed: "Executed",
  analyzed: "Analyzed",
  reviewed: "Reviewed",
  approved: "Approved",
  governed: "Governed",
  linked: "Linked",
  advanced: "Advanced",
};

export { relativeTime, formatDateTime, STAGE_META } from "@/lib/intelligence-platform";
