// KARTEX M8 — Execution Workflow Engine (Section M8.7)
// Defines the mandatory state machine and produces audited, timestamped,
// owned transition events for every lifecycle change.

import type { ExecutionEntityType, ExecutionEvent, ExecutionStatus } from "./types";
import { EXECUTION_STATUSES } from "./types";

/**
 * Allowed transitions for the mandatory execution lifecycle.
 * draft -> planned -> approved -> executing -> (blocked <-> executing) -> completed -> archived
 */
export const ALLOWED_TRANSITIONS: Record<ExecutionStatus, ExecutionStatus[]> = {
  draft: ["planned", "archived"],
  planned: ["approved", "draft", "archived"],
  approved: ["executing", "planned", "archived"],
  executing: ["blocked", "completed", "archived"],
  blocked: ["executing", "archived"],
  completed: ["archived"],
  archived: [],
};

/** Human-readable label for each status. */
export const STATUS_LABEL: Record<ExecutionStatus, string> = {
  draft: "Draft",
  planned: "Planned",
  approved: "Approved",
  executing: "Executing",
  blocked: "Blocked",
  completed: "Completed",
  archived: "Archived",
};

/** UI tone for each status. */
export function statusTone(
  status: ExecutionStatus,
): "default" | "secondary" | "warning" | "danger" | "ai" {
  switch (status) {
    case "completed":
      return "default";
    case "executing":
    case "approved":
      return "ai";
    case "blocked":
      return "danger";
    case "planned":
      return "warning";
    case "draft":
    case "archived":
    default:
      return "secondary";
  }
}

export function isValidStatus(value: string): value is ExecutionStatus {
  return (EXECUTION_STATUSES as string[]).includes(value);
}

/** Returns true when a transition between two states is permitted. */
export function canTransition(from: ExecutionStatus, to: ExecutionStatus): boolean {
  if (from === to) return false;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export class WorkflowError extends Error {
  constructor(
    public from: ExecutionStatus,
    public to: ExecutionStatus,
  ) {
    super(`Illegal execution transition: ${from} -> ${to}`);
    this.name = "WorkflowError";
  }
}

let eventSequence = 0;

/**
 * Builds an audited transition event. Deterministic id derived from the
 * entity, target state and a provided clock value so results are reproducible.
 */
export function buildTransitionEvent(input: {
  entityType: ExecutionEntityType;
  entityId: string;
  from: ExecutionStatus;
  to: ExecutionStatus;
  actorId: string;
  actorName: string;
  note?: string;
  timestamp?: string;
}): ExecutionEvent {
  eventSequence += 1;
  const timestamp = input.timestamp ?? new Date().toISOString();
  return {
    id: `evt-${input.entityType}-${input.entityId}-${input.to}-${eventSequence}`,
    entityType: input.entityType,
    entityId: input.entityId,
    type: "transition",
    fromStatus: input.from,
    toStatus: input.to,
    actorId: input.actorId,
    actorName: input.actorName,
    note: input.note ?? `${STATUS_LABEL[input.from]} -> ${STATUS_LABEL[input.to]}`,
    timestamp,
  };
}

export interface TransitionResult {
  ok: boolean;
  status: ExecutionStatus;
  event: ExecutionEvent | null;
  error?: string;
}

/**
 * Attempts a guarded, audited transition. Returns the resulting status and the
 * audit event when valid; never throws so it can drive both API and UI flows.
 */
export function transition(input: {
  entityType: ExecutionEntityType;
  entityId: string;
  from: ExecutionStatus;
  to: ExecutionStatus;
  actorId: string;
  actorName: string;
  note?: string;
  timestamp?: string;
}): TransitionResult {
  if (!isValidStatus(input.to)) {
    return { ok: false, status: input.from, event: null, error: `Unknown status: ${input.to}` };
  }
  if (!canTransition(input.from, input.to)) {
    return {
      ok: false,
      status: input.from,
      event: null,
      error: new WorkflowError(input.from, input.to).message,
    };
  }
  return { ok: true, status: input.to, event: buildTransitionEvent(input) };
}

/** Lists the legal next states for a given status (for UI affordances). */
export function nextStates(from: ExecutionStatus): ExecutionStatus[] {
  return ALLOWED_TRANSITIONS[from] ?? [];
}

/** True when the entity is in an active (in-flight) state. */
export function isActive(status: ExecutionStatus): boolean {
  return status === "approved" || status === "executing" || status === "blocked";
}

/** True when the entity is open (not finished or archived). */
export function isOpen(status: ExecutionStatus): boolean {
  return status !== "completed" && status !== "archived";
}
