"use client";

// KARTEX M8 — Interactive Execution Store
// Client-side single source of truth for the Execution workspace. Seeded
// deterministically from the engine so a non-technical user can create, assign,
// transition, escalate, measure and close work entirely inside the website.

import { create } from "zustand";
import {
  applyActivateDecision,
  applyAddIntervention,
  applyAssignOwner,
  applyCreateActionPlan,
  applyCreateInitiative,
  applyEscalationStatus,
  applyMeasureKpi,
  applyRecordOutcome,
  applyTransition,
  buildExecutionSnapshot,
  getExecutionState,
  type Actor,
  type CreateActionPlanInput,
  type CreateInitiativeInput,
  type ExecutionDataset,
  type ExecutionEntityType,
  type ExecutionSnapshot,
  type ExecutionStatus,
  type MutationResult,
} from "@/lib/execution";

const DEFAULT_ACTOR: Actor = { id: "own-amara", name: "Amara Okoye" };

type ExecutionStore = {
  data: ExecutionDataset;
  snapshot: ExecutionSnapshot;
  actor: Actor;
  lastError: string | null;
  lastEventId: string | null;
  setActor: (actor: Actor) => void;
  clearError: () => void;
  reset: () => void;
  createActionPlan: (input: CreateActionPlanInput) => boolean;
  createInitiative: (input: CreateInitiativeInput) => boolean;
  assignOwner: (
    entityType: "actionPlan" | "initiative" | "program",
    entityId: string,
    ownerId: string,
  ) => boolean;
  transitionEntity: (
    entityType: ExecutionEntityType,
    entityId: string,
    to: ExecutionStatus,
    note?: string,
  ) => boolean;
  activateDecision: (decisionId: string, ownerId?: string | null) => boolean;
  setEscalationStatus: (escalationId: string, status: "acknowledged" | "resolved") => boolean;
  addIntervention: (escalationId: string, action: string, ownerId?: string | null) => boolean;
  measureKpi: (kpiId: string, value: number) => boolean;
  recordOutcome: (outcomeId: string, actual: number) => boolean;
};

function initialState() {
  const { data, snapshot } = getExecutionState();
  return { data, snapshot };
}

export const useExecutionStore = create<ExecutionStore>((set, get) => {
  const commit = (result: MutationResult): boolean => {
    if (!result.ok) {
      set({ lastError: result.error ?? "Operation failed." });
      return false;
    }
    set({
      data: result.data,
      snapshot: buildExecutionSnapshot(result.data),
      lastError: null,
      lastEventId: result.event?.id ?? null,
    });
    return true;
  };

  return {
    ...initialState(),
    actor: DEFAULT_ACTOR,
    lastError: null,
    lastEventId: null,

    setActor: (actor) => set({ actor }),
    clearError: () => set({ lastError: null }),
    reset: () => set({ ...initialState(), lastError: null, lastEventId: null }),

    createActionPlan: (input) => commit(applyCreateActionPlan(get().data, input, get().actor)),
    createInitiative: (input) => commit(applyCreateInitiative(get().data, input, get().actor)),
    assignOwner: (entityType, entityId, ownerId) =>
      commit(applyAssignOwner(get().data, { entityType, entityId, ownerId }, get().actor)),
    transitionEntity: (entityType, entityId, to, note) =>
      commit(applyTransition(get().data, { entityType, entityId, to, actor: get().actor, note })),
    activateDecision: (decisionId, ownerId) =>
      commit(applyActivateDecision(get().data, { decisionId, ownerId }, get().actor)),
    setEscalationStatus: (escalationId, status) =>
      commit(applyEscalationStatus(get().data, { escalationId, status }, get().actor)),
    addIntervention: (escalationId, action, ownerId) =>
      commit(applyAddIntervention(get().data, { escalationId, action, ownerId }, get().actor)),
    measureKpi: (kpiId, value) => commit(applyMeasureKpi(get().data, { kpiId, value }, get().actor)),
    recordOutcome: (outcomeId, actual) =>
      commit(applyRecordOutcome(get().data, { outcomeId, actual }, get().actor)),
  };
});
