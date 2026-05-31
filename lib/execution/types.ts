// KARTEX M8 — Execution Domain Model (types)
// Deterministic, self-contained operational execution model that converts
// intelligence outputs (research, knowledge, simulation, SECIS, governance)
// into executable, measurable work.

/**
 * The mandatory execution workflow lifecycle (Section M8.7).
 * Every executable entity moves through these states via audited transitions.
 */
export type ExecutionStatus =
  | "draft"
  | "planned"
  | "approved"
  | "executing"
  | "blocked"
  | "completed"
  | "archived";

export const EXECUTION_STATUSES: ExecutionStatus[] = [
  "draft",
  "planned",
  "approved",
  "executing",
  "blocked",
  "completed",
  "archived",
];

export type Tone = "healthy" | "watch" | "degraded" | "critical";

export type Priority = "low" | "medium" | "high" | "critical";
export const PRIORITIES: Priority[] = ["low", "medium", "high", "critical"];

export type Severity = "low" | "medium" | "high" | "critical";

/** Sources of intelligence that can be activated into execution. */
export type IntelligenceSource =
  | "research"
  | "knowledge"
  | "simulation"
  | "secis"
  | "governance"
  | "commerce";

export const INTELLIGENCE_SOURCES: IntelligenceSource[] = [
  "research",
  "knowledge",
  "simulation",
  "secis",
  "governance",
  "commerce",
];

/** A person who can own or be assigned to executable work. */
export interface Owner {
  id: string;
  name: string;
  role: string;
  email: string;
  /** Concurrent capacity expressed as a count of active assignments. */
  capacity: number;
}

/** An interested party who is informed about, but does not own, the work. */
export interface Stakeholder {
  id: string;
  name: string;
  role: string;
  interest: "informed" | "consulted" | "accountable" | "responsible";
}

/** A link from an executable entity back to the intelligence that produced it. */
export interface IntelligenceLink {
  source: IntelligenceSource;
  refId: string;
  label: string;
}

/** Immutable, timestamped, owned record of any lifecycle change (Section M8.7). */
export interface ExecutionEvent {
  id: string;
  entityType: ExecutionEntityType;
  entityId: string;
  type:
    | "created"
    | "transition"
    | "assigned"
    | "linked"
    | "outcome_recorded"
    | "kpi_measured"
    | "escalated"
    | "intervention"
    | "review"
    | "decision_activated";
  fromStatus?: ExecutionStatus | null;
  toStatus?: ExecutionStatus | null;
  actorId: string;
  actorName: string;
  note: string;
  timestamp: string;
}

export type ExecutionEntityType =
  | "program"
  | "initiative"
  | "project"
  | "actionPlan"
  | "task"
  | "milestone"
  | "escalation"
  | "decision";

/** A discrete unit of work belonging to an action plan. */
export interface Task {
  id: string;
  title: string;
  status: ExecutionStatus;
  ownerId: string | null;
  actionPlanId: string;
  estimateHours: number;
  completed: boolean;
}

/** A dated checkpoint used to measure progress. */
export interface Milestone {
  id: string;
  name: string;
  dueDate: string;
  status: "upcoming" | "at_risk" | "met" | "missed";
  initiativeId: string;
}

/**
 * The core executable unit (Section M8.4). Created from intelligence,
 * assigned to an owner, prioritised, scheduled, and tracked to completion.
 */
export interface ActionPlan {
  id: string;
  code: string;
  title: string;
  description: string;
  status: ExecutionStatus;
  priority: Priority;
  ownerId: string | null;
  initiativeId: string | null;
  deadline: string;
  progress: number; // 0..100
  taskIds: string[];
  links: IntelligenceLink[];
  createdAt: string;
  updatedAt: string;
}

/** A bounded, time-boxed effort that delivers a measurable outcome (M8.5). */
export interface Initiative {
  id: string;
  code: string;
  name: string;
  description: string;
  status: ExecutionStatus;
  programId: string | null;
  ownerId: string | null;
  teamIds: string[];
  actionPlanIds: string[];
  kpiIds: string[];
  decisionId: string | null;
  startDate: string;
  targetDate: string;
  progress: number; // 0..100
}

/** A delivery vehicle nested under an initiative. */
export interface Project {
  id: string;
  name: string;
  status: ExecutionStatus;
  initiativeId: string;
  ownerId: string | null;
  taskIds: string[];
  milestoneIds: string[];
}

/** A portfolio that coordinates multiple initiatives (M8.6). */
export interface Program {
  id: string;
  code: string;
  name: string;
  description: string;
  status: ExecutionStatus;
  ownerId: string | null;
  sponsorId: string | null;
  startDate: string;
  targetDate: string;
  initiativeIds: string[];
  kpiIds: string[];
  riskIds: string[];
  dependencyIds: string[];
}

/** Expected vs actual result tracking for an initiative (M8.8). */
export interface Outcome {
  id: string;
  initiativeId: string;
  metric: string;
  unit: string;
  expected: number;
  actual: number | null;
  recordedAt: string | null;
  status: "pending" | "achieved" | "partial" | "missed";
}

export interface Metric {
  id: string;
  name: string;
  value: number;
  unit: string;
}

/** A tracked Key Performance Indicator (M8.9). */
export interface KPI {
  id: string;
  code: string;
  name: string;
  ownerId: string | null;
  programId: string | null;
  unit: string;
  target: number;
  current: number;
  /** Whether higher or lower values are better. */
  direction: "increase" | "decrease";
  status: "on_track" | "at_risk" | "off_track";
  trend: number[];
}

/** A captured result statement for a completed initiative. */
export interface Result {
  id: string;
  initiativeId: string;
  summary: string;
  success: boolean;
  recordedAt: string;
}

export interface Review {
  id: string;
  entityType: ExecutionEntityType;
  entityId: string;
  reviewerId: string;
  rating: number; // 1..5
  notes: string;
  date: string;
}

export interface Retrospective {
  id: string;
  initiativeId: string;
  wentWell: string[];
  improve: string[];
  followUps: string[];
  date: string;
}

/** A corrective action attached to an escalation (M8.10). */
export interface Intervention {
  id: string;
  escalationId: string;
  action: string;
  ownerId: string | null;
  date: string;
}

/** A raised issue requiring attention (M8.10). */
export interface Escalation {
  id: string;
  title: string;
  severity: Severity;
  reason: string;
  sourceType: ExecutionEntityType;
  sourceId: string;
  status: "open" | "acknowledged" | "resolved";
  ownerId: string | null;
  interventionIds: string[];
  createdAt: string;
}

/** A risk that may impede execution. */
export interface ExecutionRisk {
  id: string;
  title: string;
  likelihood: number; // 1..5
  impact: number; // 1..5
  score: number; // likelihood * impact
  status: "open" | "mitigating" | "closed";
  ownerId: string | null;
  programId: string | null;
  mitigation: string;
}

/** A dependency relationship between two executable entities. */
export interface Dependency {
  id: string;
  fromId: string;
  toId: string;
  type: "blocks" | "requires" | "relates";
  status: "open" | "satisfied";
}

/** A governance/intelligence decision eligible for activation (M8.11). */
export interface Decision {
  id: string;
  title: string;
  description: string;
  source: IntelligenceSource;
  status: "pending" | "approved" | "activated";
  approvedBy: string | null;
  approvedAt: string | null;
  activatedInitiativeId: string | null;
  recommendedPriority: Priority;
}

/** The complete in-memory execution dataset. */
export interface ExecutionDataset {
  owners: Owner[];
  stakeholders: Stakeholder[];
  programs: Program[];
  initiatives: Initiative[];
  projects: Project[];
  actionPlans: ActionPlan[];
  tasks: Task[];
  milestones: Milestone[];
  kpis: KPI[];
  outcomes: Outcome[];
  results: Result[];
  reviews: Review[];
  retrospectives: Retrospective[];
  escalations: Escalation[];
  interventions: Intervention[];
  risks: ExecutionRisk[];
  dependencies: Dependency[];
  decisions: Decision[];
  events: ExecutionEvent[];
}
