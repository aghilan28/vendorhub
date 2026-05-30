// KARTEX M8 — Execution Mutations
// Immutable, reducer-style operations over an ExecutionDataset. Shared by the
// deterministic API and the interactive client store so the same rules govern
// every state change (Section M8.7: audited, timestamped, owned, governed).

import {
  activateDecision as activateDecisionFactory,
  createActionPlan as createActionPlanFactory,
  createInitiative as createInitiativeFactory,
  createIntervention as createInterventionFactory,
  evaluateKpiStatus,
  evaluateOutcomeStatus,
  type CreateActionPlanInput,
  type CreateInitiativeInput,
} from "./factory";
import { transition } from "./workflow";
import type {
  ExecutionDataset,
  ExecutionEntityType,
  ExecutionEvent,
  ExecutionStatus,
} from "./types";

export interface Actor {
  id: string;
  name: string;
}

export interface MutationResult {
  data: ExecutionDataset;
  ok: boolean;
  event: ExecutionEvent | null;
  error?: string;
}

function clone(data: ExecutionDataset): ExecutionDataset {
  return structuredClone(data);
}

function statusHolder(data: ExecutionDataset, type: ExecutionEntityType, id: string) {
  switch (type) {
    case "program":
      return data.programs.find((x) => x.id === id);
    case "initiative":
      return data.initiatives.find((x) => x.id === id);
    case "project":
      return data.projects.find((x) => x.id === id);
    case "actionPlan":
      return data.actionPlans.find((x) => x.id === id);
    case "task":
      return data.tasks.find((x) => x.id === id);
    default:
      return undefined;
  }
}

/** Applies a guarded, audited workflow transition to any executable entity. */
export function applyTransition(
  dataset: ExecutionDataset,
  input: {
    entityType: ExecutionEntityType;
    entityId: string;
    to: ExecutionStatus;
    actor: Actor;
    note?: string;
    timestamp?: string;
  },
): MutationResult {
  const data = clone(dataset);
  const entity = statusHolder(data, input.entityType, input.entityId) as
    | { status: ExecutionStatus; progress?: number; completed?: boolean }
    | undefined;

  if (!entity) {
    return { data: dataset, ok: false, event: null, error: "Entity not found." };
  }

  const result = transition({
    entityType: input.entityType,
    entityId: input.entityId,
    from: entity.status,
    to: input.to,
    actorId: input.actor.id,
    actorName: input.actor.name,
    note: input.note,
    timestamp: input.timestamp,
  });

  if (!result.ok || !result.event) {
    return { data: dataset, ok: false, event: null, error: result.error };
  }

  entity.status = result.status;
  if (input.to === "completed") {
    if ("progress" in entity) entity.progress = 100;
    if ("completed" in entity) entity.completed = true;
  }
  data.events = [result.event, ...data.events];
  return { data, ok: true, event: result.event };
}

export function applyCreateActionPlan(
  dataset: ExecutionDataset,
  input: CreateActionPlanInput,
  actor: Actor,
): MutationResult {
  const data = clone(dataset);
  const plan = createActionPlanFactory(input);
  data.actionPlans = [plan, ...data.actionPlans];
  if (plan.initiativeId) {
    const initiative = data.initiatives.find((i) => i.id === plan.initiativeId);
    if (initiative && !initiative.actionPlanIds.includes(plan.id)) {
      initiative.actionPlanIds = [...initiative.actionPlanIds, plan.id];
    }
  }
  const event: ExecutionEvent = {
    id: `evt-create-${plan.id}`,
    entityType: "actionPlan",
    entityId: plan.id,
    type: "created",
    actorId: actor.id,
    actorName: actor.name,
    note: `Created action plan "${plan.title}".`,
    timestamp: input.now ?? new Date().toISOString(),
  };
  data.events = [event, ...data.events];
  return { data, ok: true, event };
}

export function applyCreateInitiative(
  dataset: ExecutionDataset,
  input: CreateInitiativeInput,
  actor: Actor,
): MutationResult {
  const data = clone(dataset);
  const initiative = createInitiativeFactory(input);
  data.initiatives = [initiative, ...data.initiatives];
  if (initiative.programId) {
    const program = data.programs.find((p) => p.id === initiative.programId);
    if (program && !program.initiativeIds.includes(initiative.id)) {
      program.initiativeIds = [...program.initiativeIds, initiative.id];
    }
  }
  const event: ExecutionEvent = {
    id: `evt-create-${initiative.id}`,
    entityType: "initiative",
    entityId: initiative.id,
    type: "created",
    actorId: actor.id,
    actorName: actor.name,
    note: `Created initiative "${initiative.name}".`,
    timestamp: input.now ?? new Date().toISOString(),
  };
  data.events = [event, ...data.events];
  return { data, ok: true, event };
}

export function applyAssignOwner(
  dataset: ExecutionDataset,
  input: { entityType: "actionPlan" | "initiative" | "program"; entityId: string; ownerId: string },
  actor: Actor,
): MutationResult {
  const data = clone(dataset);
  const collection =
    input.entityType === "actionPlan"
      ? data.actionPlans
      : input.entityType === "initiative"
        ? data.initiatives
        : data.programs;
  const entity = collection.find((x) => x.id === input.entityId) as { ownerId: string | null } | undefined;
  if (!entity) return { data: dataset, ok: false, event: null, error: "Entity not found." };
  const owner = data.owners.find((o) => o.id === input.ownerId);
  if (!owner) return { data: dataset, ok: false, event: null, error: "Owner not found." };
  entity.ownerId = input.ownerId;
  const event: ExecutionEvent = {
    id: `evt-assign-${input.entityId}-${input.ownerId}`,
    entityType: input.entityType,
    entityId: input.entityId,
    type: "assigned",
    actorId: actor.id,
    actorName: actor.name,
    note: `Assigned to ${owner.name}.`,
    timestamp: new Date().toISOString(),
  };
  data.events = [event, ...data.events];
  return { data, ok: true, event };
}

/** Decision Activation (M8.11): decision -> action plan -> initiative, no re-entry. */
export function applyActivateDecision(
  dataset: ExecutionDataset,
  input: { decisionId: string; ownerId?: string | null; now?: string },
  actor: Actor,
): MutationResult {
  const data = clone(dataset);
  const decision = data.decisions.find((d) => d.id === input.decisionId);
  if (!decision) return { data: dataset, ok: false, event: null, error: "Decision not found." };
  if (decision.status === "pending") {
    return { data: dataset, ok: false, event: null, error: "Decision must be approved before activation." };
  }
  if (decision.status === "activated") {
    return { data: dataset, ok: false, event: null, error: "Decision already activated." };
  }

  const { initiative, actionPlan, decision: activated } = activateDecisionFactory(decision, {
    ownerId: input.ownerId,
    now: input.now,
  });

  data.decisions = data.decisions.map((d) => (d.id === decision.id ? activated : d));
  data.initiatives = [initiative, ...data.initiatives];
  data.actionPlans = [actionPlan, ...data.actionPlans];

  const event: ExecutionEvent = {
    id: `evt-activate-${decision.id}`,
    entityType: "decision",
    entityId: decision.id,
    type: "decision_activated",
    actorId: actor.id,
    actorName: actor.name,
    note: `Activated "${decision.title}" into ${initiative.code}.`,
    timestamp: input.now ?? new Date().toISOString(),
  };
  data.events = [event, ...data.events];
  return { data, ok: true, event };
}

export function applyEscalationStatus(
  dataset: ExecutionDataset,
  input: { escalationId: string; status: "acknowledged" | "resolved" },
  actor: Actor,
): MutationResult {
  const data = clone(dataset);
  const escalation = data.escalations.find((e) => e.id === input.escalationId);
  if (!escalation) return { data: dataset, ok: false, event: null, error: "Escalation not found." };
  escalation.status = input.status;
  const event: ExecutionEvent = {
    id: `evt-esc-${escalation.id}-${input.status}`,
    entityType: "escalation",
    entityId: escalation.id,
    type: "escalated",
    actorId: actor.id,
    actorName: actor.name,
    note: `Escalation ${input.status}.`,
    timestamp: new Date().toISOString(),
  };
  data.events = [event, ...data.events];
  return { data, ok: true, event };
}

export function applyAddIntervention(
  dataset: ExecutionDataset,
  input: { escalationId: string; action: string; ownerId?: string | null; now?: string },
  actor: Actor,
): MutationResult {
  const data = clone(dataset);
  const escalation = data.escalations.find((e) => e.id === input.escalationId);
  if (!escalation) return { data: dataset, ok: false, event: null, error: "Escalation not found." };
  const intervention = createInterventionFactory(input);
  data.interventions = [intervention, ...data.interventions];
  escalation.interventionIds = [...escalation.interventionIds, intervention.id];
  const event: ExecutionEvent = {
    id: `evt-itv-${intervention.id}`,
    entityType: "escalation",
    entityId: escalation.id,
    type: "intervention",
    actorId: actor.id,
    actorName: actor.name,
    note: `Intervention logged: ${input.action}`,
    timestamp: input.now ?? new Date().toISOString(),
  };
  data.events = [event, ...data.events];
  return { data, ok: true, event };
}

export function applyMeasureKpi(
  dataset: ExecutionDataset,
  input: { kpiId: string; value: number },
  actor: Actor,
): MutationResult {
  const data = clone(dataset);
  const kpi = data.kpis.find((k) => k.id === input.kpiId);
  if (!kpi) return { data: dataset, ok: false, event: null, error: "KPI not found." };
  kpi.current = input.value;
  kpi.trend = [...kpi.trend, input.value].slice(-12);
  kpi.status = evaluateKpiStatus(kpi.current, kpi.target, kpi.direction);
  const event: ExecutionEvent = {
    id: `evt-kpi-${kpi.id}-${kpi.trend.length}`,
    entityType: "initiative",
    entityId: kpi.id,
    type: "kpi_measured",
    actorId: actor.id,
    actorName: actor.name,
    note: `${kpi.name} measured at ${input.value}${kpi.unit}.`,
    timestamp: new Date().toISOString(),
  };
  data.events = [event, ...data.events];
  return { data, ok: true, event };
}

export function applyRecordOutcome(
  dataset: ExecutionDataset,
  input: { outcomeId: string; actual: number; now?: string },
  actor: Actor,
): MutationResult {
  const data = clone(dataset);
  const outcome = data.outcomes.find((o) => o.id === input.outcomeId);
  if (!outcome) return { data: dataset, ok: false, event: null, error: "Outcome not found." };
  outcome.actual = input.actual;
  outcome.recordedAt = input.now ?? new Date().toISOString();
  outcome.status = evaluateOutcomeStatus(outcome.expected, input.actual);
  const event: ExecutionEvent = {
    id: `evt-out-${outcome.id}`,
    entityType: "initiative",
    entityId: outcome.initiativeId,
    type: "outcome_recorded",
    actorId: actor.id,
    actorName: actor.name,
    note: `Outcome "${outcome.metric}" recorded at ${input.actual}${outcome.unit} (${outcome.status}).`,
    timestamp: outcome.recordedAt,
  };
  data.events = [event, ...data.events];
  return { data, ok: true, event };
}
