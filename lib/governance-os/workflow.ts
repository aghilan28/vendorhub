// KARTEX M5 — Governed lifecycle state machines.

import type { DecisionStatus, ExceptionStatus, PolicyStatus, WorkflowDefinition } from "./types";

export const POLICY_ORDER: PolicyStatus[] = ["draft", "review", "approved", "published", "archived"];
export const POLICY_TRANSITIONS: Record<PolicyStatus, PolicyStatus[]> = {
  draft: ["review", "archived"],
  review: ["approved", "draft", "archived"],
  approved: ["published", "review", "archived"],
  published: ["review", "archived"],
  archived: ["draft"],
};

export const DECISION_ORDER: DecisionStatus[] = ["draft", "review", "approved", "rejected", "exception", "archived"];
export const DECISION_TRANSITIONS: Record<DecisionStatus, DecisionStatus[]> = {
  draft: ["review", "archived"],
  review: ["approved", "rejected", "exception", "draft", "archived"],
  approved: ["review", "archived"],
  rejected: ["draft", "archived"],
  exception: ["review", "approved", "archived"],
  archived: ["draft"],
};

export const EXCEPTION_ORDER: ExceptionStatus[] = ["requested", "review", "approved", "rejected", "expired", "archived"];
export const EXCEPTION_TRANSITIONS: Record<ExceptionStatus, ExceptionStatus[]> = {
  requested: ["review", "rejected", "archived"],
  review: ["approved", "rejected", "requested"],
  approved: ["expired", "archived"],
  rejected: ["requested", "archived"],
  expired: ["archived"],
  archived: [],
};

export const WORKFLOW_DEFINITIONS: WorkflowDefinition[] = [
  { id: "wf-policy", name: "Policy lifecycle", objectType: "policy", states: POLICY_ORDER, transitions: POLICY_TRANSITIONS },
  { id: "wf-decision", name: "Decision approval workflow", objectType: "decision", states: DECISION_ORDER, transitions: DECISION_TRANSITIONS },
  { id: "wf-exception", name: "Exception lifecycle", objectType: "exception", states: EXCEPTION_ORDER, transitions: EXCEPTION_TRANSITIONS },
];

export function canTransition(objectType: "policy" | "decision" | "exception", from: string, to: string): boolean {
  const map = objectType === "policy" ? POLICY_TRANSITIONS : objectType === "decision" ? DECISION_TRANSITIONS : EXCEPTION_TRANSITIONS;
  return (map as Record<string, string[]>)[from]?.includes(to) ?? false;
}
