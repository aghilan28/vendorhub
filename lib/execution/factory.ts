// KARTEX M8 — Execution Entity Factory
// Pure constructors for executable entities. Ids are deterministic when a seed
// is supplied, so the same inputs always produce the same entity.

import type {
  ActionPlan,
  Decision,
  Escalation,
  Initiative,
  IntelligenceLink,
  Intervention,
  KPI,
  Outcome,
  Priority,
  Program,
} from "./types";

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function shortId(prefix: string, seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return `${prefix}-${hash.toString(36)}`;
}

export interface CreateActionPlanInput {
  title: string;
  description?: string;
  priority?: Priority;
  ownerId?: string | null;
  initiativeId?: string | null;
  deadline?: string;
  links?: IntelligenceLink[];
  now?: string;
}

export function createActionPlan(input: CreateActionPlanInput): ActionPlan {
  const now = input.now ?? new Date().toISOString();
  const id = shortId("ap", `${input.title}|${now}`);
  return {
    id,
    code: `AP-${slug(input.title).toUpperCase().slice(0, 12) || id.toUpperCase()}`,
    title: input.title,
    description: input.description ?? "",
    status: "draft",
    priority: input.priority ?? "medium",
    ownerId: input.ownerId ?? null,
    initiativeId: input.initiativeId ?? null,
    deadline: input.deadline ?? now,
    progress: 0,
    taskIds: [],
    links: input.links ?? [],
    createdAt: now,
    updatedAt: now,
  };
}

export interface CreateInitiativeInput {
  name: string;
  description?: string;
  programId?: string | null;
  ownerId?: string | null;
  decisionId?: string | null;
  startDate?: string;
  targetDate?: string;
  now?: string;
}

export function createInitiative(input: CreateInitiativeInput): Initiative {
  const now = input.now ?? new Date().toISOString();
  const id = shortId("ini", `${input.name}|${now}`);
  return {
    id,
    code: `INI-${slug(input.name).toUpperCase().slice(0, 12) || id.toUpperCase()}`,
    name: input.name,
    description: input.description ?? "",
    status: "draft",
    programId: input.programId ?? null,
    ownerId: input.ownerId ?? null,
    teamIds: [],
    actionPlanIds: [],
    kpiIds: [],
    decisionId: input.decisionId ?? null,
    startDate: input.startDate ?? now,
    targetDate: input.targetDate ?? now,
    progress: 0,
  };
}

export interface CreateProgramInput {
  name: string;
  description?: string;
  ownerId?: string | null;
  sponsorId?: string | null;
  startDate?: string;
  targetDate?: string;
  now?: string;
}

export function createProgram(input: CreateProgramInput): Program {
  const now = input.now ?? new Date().toISOString();
  const id = shortId("prg", `${input.name}|${now}`);
  return {
    id,
    code: `PRG-${slug(input.name).toUpperCase().slice(0, 12) || id.toUpperCase()}`,
    name: input.name,
    description: input.description ?? "",
    status: "draft",
    ownerId: input.ownerId ?? null,
    sponsorId: input.sponsorId ?? null,
    startDate: input.startDate ?? now,
    targetDate: input.targetDate ?? now,
    initiativeIds: [],
    kpiIds: [],
    riskIds: [],
    dependencyIds: [],
  };
}

export interface CreateKpiInput {
  name: string;
  unit: string;
  target: number;
  current?: number;
  direction?: "increase" | "decrease";
  ownerId?: string | null;
  programId?: string | null;
}

export function evaluateKpiStatus(
  current: number,
  target: number,
  direction: "increase" | "decrease",
): KPI["status"] {
  const attainment = computeKpiAttainment(current, target, direction);
  if (attainment >= 0.95) return "on_track";
  if (attainment >= 0.8) return "at_risk";
  return "off_track";
}

/** Attainment ratio in [0, 1.5]; 1 means target met. */
export function computeKpiAttainment(
  current: number,
  target: number,
  direction: "increase" | "decrease",
): number {
  if (target === 0) return current === 0 ? 1 : 0;
  const ratio = direction === "increase" ? current / target : target / current;
  if (!Number.isFinite(ratio) || ratio < 0) return 0;
  return Math.min(1.5, ratio);
}

export function createKpi(input: CreateKpiInput): KPI {
  const id = shortId("kpi", `${input.name}|${input.unit}`);
  const current = input.current ?? 0;
  const direction = input.direction ?? "increase";
  return {
    id,
    code: `KPI-${slug(input.name).toUpperCase().slice(0, 12) || id.toUpperCase()}`,
    name: input.name,
    ownerId: input.ownerId ?? null,
    programId: input.programId ?? null,
    unit: input.unit,
    target: input.target,
    current,
    direction,
    status: evaluateKpiStatus(current, input.target, direction),
    trend: [current],
  };
}

export interface CreateOutcomeInput {
  initiativeId: string;
  metric: string;
  unit: string;
  expected: number;
  actual?: number | null;
  now?: string;
}

export function evaluateOutcomeStatus(expected: number, actual: number | null): Outcome["status"] {
  if (actual === null || actual === undefined) return "pending";
  if (expected === 0) return actual === 0 ? "achieved" : "partial";
  const ratio = actual / expected;
  if (ratio >= 1) return "achieved";
  if (ratio >= 0.7) return "partial";
  return "missed";
}

export function createOutcome(input: CreateOutcomeInput): Outcome {
  const id = shortId("out", `${input.initiativeId}|${input.metric}`);
  const actual = input.actual ?? null;
  return {
    id,
    initiativeId: input.initiativeId,
    metric: input.metric,
    unit: input.unit,
    expected: input.expected,
    actual,
    recordedAt: actual === null ? null : (input.now ?? new Date().toISOString()),
    status: evaluateOutcomeStatus(input.expected, actual),
  };
}

export interface CreateEscalationInput {
  title: string;
  severity?: Escalation["severity"];
  reason: string;
  sourceType: Escalation["sourceType"];
  sourceId: string;
  ownerId?: string | null;
  now?: string;
}

export function createEscalation(input: CreateEscalationInput): Escalation {
  const now = input.now ?? new Date().toISOString();
  const id = shortId("esc", `${input.sourceType}|${input.sourceId}|${input.title}`);
  return {
    id,
    title: input.title,
    severity: input.severity ?? "high",
    reason: input.reason,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    status: "open",
    ownerId: input.ownerId ?? null,
    interventionIds: [],
    createdAt: now,
  };
}

export function createIntervention(input: {
  escalationId: string;
  action: string;
  ownerId?: string | null;
  now?: string;
}): Intervention {
  const now = input.now ?? new Date().toISOString();
  const id = shortId("itv", `${input.escalationId}|${input.action}`);
  return {
    id,
    escalationId: input.escalationId,
    action: input.action,
    ownerId: input.ownerId ?? null,
    date: now,
  };
}

/**
 * Decision Activation (Section M8.11): converts an approved decision into an
 * action plan + initiative pair without manual re-entry.
 */
export function activateDecision(
  decision: Decision,
  options: { ownerId?: string | null; now?: string } = {},
): { initiative: Initiative; actionPlan: ActionPlan; decision: Decision } {
  const now = options.now ?? new Date().toISOString();
  const initiative = createInitiative({
    name: decision.title,
    description: decision.description,
    ownerId: options.ownerId ?? null,
    decisionId: decision.id,
    now,
  });
  const actionPlan = createActionPlan({
    title: `Execute: ${decision.title}`,
    description: decision.description,
    priority: decision.recommendedPriority,
    ownerId: options.ownerId ?? null,
    initiativeId: initiative.id,
    links: [{ source: decision.source, refId: decision.id, label: decision.title }],
    now,
  });
  initiative.actionPlanIds = [actionPlan.id];
  initiative.status = "planned";
  const activated: Decision = {
    ...decision,
    status: "activated",
    activatedInitiativeId: initiative.id,
  };
  return { initiative, actionPlan, decision: activated };
}
