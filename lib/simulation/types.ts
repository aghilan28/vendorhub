// KARTEX M3 — Simulation Operating System domain model.
// 18 first-class entities, each with schema, relationships, lifecycle, ownership,
// permissions and governance fields. This module is framework-agnostic and
// browser-safe (no Node-only imports).

// ──────────────────────────────────────────────────────────────────────────
// Shared primitives
// ──────────────────────────────────────────────────────────────────────────

export type ISODate = string;

export type SimulationRole = "owner" | "editor" | "reviewer" | "viewer";

export type Visibility = "private" | "team" | "organization";

export type WorkflowState =
  | "draft"
  | "review"
  | "approved"
  | "scheduled"
  | "running"
  | "completed"
  | "archived";

export type RunStatus =
  | "queued"
  | "running"
  | "paused"
  | "completed"
  | "cancelled"
  | "failed";

export type RiskLevel = "low" | "medium" | "high";

export type InsightKind =
  | "insight"
  | "opportunity"
  | "risk"
  | "warning"
  | "recommendation"
  | "decision_support";

export type Tone = "success" | "warning" | "danger" | "neutral" | "info";

export type ModelKey =
  | "market_adoption"
  | "demand_forecast"
  | "revenue_projection"
  | "pricing_sensitivity"
  | "inventory_simulation"
  | "competitive_dynamics";

export type ParameterKind = "number" | "percent" | "currency" | "integer" | "select";

// ──────────────────────────────────────────────────────────────────────────
// 1. Simulation Variable (output dimension defined by a model)
// ──────────────────────────────────────────────────────────────────────────

export interface SimulationVariable {
  key: string;
  label: string;
  unit?: string;
  description: string;
}

// ──────────────────────────────────────────────────────────────────────────
// 2. Simulation Parameter (typed, visual-editable input definition)
// ──────────────────────────────────────────────────────────────────────────

export interface SimulationParameterOption {
  value: string;
  label: string;
}

export interface SimulationParameter {
  key: string;
  label: string;
  kind: ParameterKind;
  defaultValue: number | string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  help: string;
  options?: SimulationParameterOption[];
  group?: string;
}

// ──────────────────────────────────────────────────────────────────────────
// 3. Simulation Template (reusable blueprint: model + parameter schema)
// ──────────────────────────────────────────────────────────────────────────

export interface SimulationTemplate {
  id: string;
  modelKey: ModelKey;
  name: string;
  summary: string;
  category: string;
  tags: string[];
  parameters: SimulationParameter[];
  variables: SimulationVariable[];
  defaultAssumptions: string[];
  defaultConstraints: Array<Pick<SimulationConstraint, "metric" | "operator" | "threshold" | "label">>;
  builtIn: boolean;
  createdBy?: string;
  createdAt?: ISODate;
}

// ──────────────────────────────────────────────────────────────────────────
// 4. Simulation Assumption
// ──────────────────────────────────────────────────────────────────────────

export interface SimulationAssumption {
  id: string;
  statement: string;
  rationale?: string;
  confidence: "low" | "medium" | "high";
  createdAt: ISODate;
}

// ──────────────────────────────────────────────────────────────────────────
// 5. Simulation Constraint (a bound the result is validated against)
// ──────────────────────────────────────────────────────────────────────────

export type ConstraintOperator = "lte" | "gte" | "eq";

export interface SimulationConstraint {
  id: string;
  label: string;
  metric: string; // a KPI key produced by the model
  operator: ConstraintOperator;
  threshold: number;
}

// ──────────────────────────────────────────────────────────────────────────
// 6. Simulation Scenario (a configured, runnable parameter set)
// ──────────────────────────────────────────────────────────────────────────

export interface SimulationScenario {
  id: string;
  simulationId: string;
  name: string;
  description: string;
  templateId: string;
  modelKey: ModelKey;
  parameters: Record<string, number | string>;
  assumptions: SimulationAssumption[];
  constraints: SimulationConstraint[];
  category: string;
  tags: string[];
  seed: number;
  status: "active" | "archived";
  isBaseline: boolean;
  createdBy: string;
  createdAt: ISODate;
  updatedAt: ISODate;
  clonedFrom?: string;
}

// ──────────────────────────────────────────────────────────────────────────
// 7. Simulation Contributor
// ──────────────────────────────────────────────────────────────────────────

export interface SimulationContributor {
  userId: string;
  name: string;
  role: SimulationRole;
  addedAt: ISODate;
}

// ──────────────────────────────────────────────────────────────────────────
// 8. Simulation Version (immutable snapshot of configuration)
// ──────────────────────────────────────────────────────────────────────────

export interface SimulationVersion {
  id: string;
  simulationId: string;
  version: number;
  label: string;
  authorId: string;
  createdAt: ISODate;
  snapshot: {
    name: string;
    description: string;
    scenarioCount: number;
    workflowState: WorkflowState;
  };
}

// ──────────────────────────────────────────────────────────────────────────
// 9. Simulation Review
// ──────────────────────────────────────────────────────────────────────────

export type ReviewDecision = "pending" | "changes_requested" | "approved" | "rejected";

export interface SimulationReview {
  id: string;
  simulationId: string;
  reviewerId: string;
  reviewerName: string;
  decision: ReviewDecision;
  comment: string;
  createdAt: ISODate;
}

// ──────────────────────────────────────────────────────────────────────────
// 10. Simulation Approval
// ──────────────────────────────────────────────────────────────────────────

export interface SimulationApproval {
  id: string;
  simulationId: string;
  approverId: string;
  approverName: string;
  approved: boolean;
  note: string;
  createdAt: ISODate;
}

// ──────────────────────────────────────────────────────────────────────────
// 11. Simulation (top-level governed project / container of scenarios)
// ──────────────────────────────────────────────────────────────────────────

export interface Simulation {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  modelKey: ModelKey;
  ownerId: string;
  ownerName: string;
  visibility: Visibility;
  workflowState: WorkflowState;
  version: number;
  contributors: SimulationContributor[];
  createdAt: ISODate;
  updatedAt: ISODate;
  archivedAt?: ISODate;
}

// ──────────────────────────────────────────────────────────────────────────
// 12. Simulation Result (output of a single run)
// ──────────────────────────────────────────────────────────────────────────

export interface SeriesPoint {
  x: number;
  y: number;
}

export interface ResultSeries {
  key: string;
  label: string;
  color: "brand" | "ai" | "warning" | "danger" | "neutral";
  points: SeriesPoint[];
}

export interface ResultKpi {
  key: string;
  label: string;
  value: number;
  display: string;
  unit?: string;
  tone: Tone;
}

export interface SensitivityEntry {
  parameterKey: string;
  parameterLabel: string;
  lowValue: number;
  highValue: number;
  outcomeDelta: number; // % impact on the headline KPI
}

export interface RiskAnalysis {
  level: RiskLevel;
  score: number; // 0..100
  factors: Array<{ label: string; impact: RiskLevel; detail: string }>;
}

export interface ConstraintCheck {
  constraintId: string;
  label: string;
  metric: string;
  operator: ConstraintOperator;
  threshold: number;
  actual: number;
  satisfied: boolean;
}

export interface SimulationResult {
  headlineKpiKey: string;
  kpis: ResultKpi[];
  series: ResultSeries[];
  table: { columns: string[]; rows: string[][] };
  distribution?: number[];
  sensitivity: SensitivityEntry[];
  risk: RiskAnalysis;
  constraintChecks: ConstraintCheck[];
  outcomeSummary: string;
  trendSummary: string;
}

// ──────────────────────────────────────────────────────────────────────────
// 13. Simulation Insight
// ──────────────────────────────────────────────────────────────────────────

export interface SimulationInsight {
  id: string;
  runId: string;
  simulationId: string;
  scenarioId: string;
  kind: InsightKind;
  title: string;
  detail: string;
  confidence: number; // 0..1
  createdAt: ISODate;
}

// ──────────────────────────────────────────────────────────────────────────
// 14. Simulation Recommendation
// ──────────────────────────────────────────────────────────────────────────

export interface SimulationRecommendation {
  id: string;
  runId: string;
  simulationId: string;
  scenarioId: string;
  title: string;
  action: string;
  rationale: string;
  expectedImpact: string;
  priority: "low" | "medium" | "high";
  accepted?: boolean;
  createdAt: ISODate;
}

// ──────────────────────────────────────────────────────────────────────────
// 15. Simulation Run (an execution instance)
// ──────────────────────────────────────────────────────────────────────────

export interface RunLogEntry {
  at: ISODate;
  level: "info" | "warn" | "error";
  message: string;
}

export interface SimulationRun {
  id: string;
  simulationId: string;
  scenarioId: string;
  scenarioName: string;
  modelKey: ModelKey;
  label: string;
  status: RunStatus;
  progress: number; // 0..100
  seed: number;
  parameters: Record<string, number | string>;
  startedAt: ISODate;
  completedAt?: ISODate;
  runtimeMs: number;
  triggeredBy: string;
  logs: RunLogEntry[];
  result?: SimulationResult;
  insightIds: string[];
  recommendationIds: string[];
}

// ──────────────────────────────────────────────────────────────────────────
// 16. Simulation Comparison
// ──────────────────────────────────────────────────────────────────────────

export interface SimulationComparison {
  id: string;
  name: string;
  runIds: string[];
  createdBy: string;
  createdAt: ISODate;
  note: string;
}

// ──────────────────────────────────────────────────────────────────────────
// 17. Simulation Decision
// ──────────────────────────────────────────────────────────────────────────

export type DecisionOutcome = "adopt" | "reject" | "defer" | "investigate";

export interface SimulationDecision {
  id: string;
  simulationId: string;
  runId?: string;
  title: string;
  outcome: DecisionOutcome;
  rationale: string;
  decidedBy: string;
  impact: "low" | "medium" | "high";
  createdAt: ISODate;
}

// ──────────────────────────────────────────────────────────────────────────
// 18. Simulation History (audit trail of every action)
// ──────────────────────────────────────────────────────────────────────────

export type HistoryAction =
  | "simulation_created"
  | "simulation_updated"
  | "simulation_archived"
  | "scenario_created"
  | "scenario_updated"
  | "scenario_cloned"
  | "scenario_archived"
  | "scenario_deleted"
  | "run_started"
  | "run_paused"
  | "run_resumed"
  | "run_cancelled"
  | "run_completed"
  | "comparison_created"
  | "workflow_transition"
  | "review_submitted"
  | "approval_recorded"
  | "decision_recorded"
  | "recommendation_accepted"
  | "version_saved"
  | "template_saved";

export interface SimulationHistoryEvent {
  id: string;
  action: HistoryAction;
  simulationId?: string;
  scenarioId?: string;
  runId?: string;
  actorId: string;
  actorName: string;
  summary: string;
  meta?: Record<string, string | number>;
  at: ISODate;
}

// ──────────────────────────────────────────────────────────────────────────
// Users / RBAC
// ──────────────────────────────────────────────────────────────────────────

export type PlatformRole = "admin" | "analyst" | "reviewer" | "viewer";

export interface SimulationUser {
  id: string;
  name: string;
  role: PlatformRole;
}

export type Permission =
  | "simulation.create"
  | "simulation.edit"
  | "simulation.delete"
  | "scenario.run"
  | "review.submit"
  | "approval.record"
  | "decision.record"
  | "settings.manage";

// ──────────────────────────────────────────────────────────────────────────
// Settings
// ──────────────────────────────────────────────────────────────────────────

export interface SimulationSettings {
  defaultVisibility: Visibility;
  requireApprovalBeforeRun: boolean;
  defaultSeed: number;
  retainRuns: number;
  autoGenerateInsights: boolean;
}

// ──────────────────────────────────────────────────────────────────────────
// Workflow transition map (lifecycle governance)
// ──────────────────────────────────────────────────────────────────────────

export const WORKFLOW_TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
  draft: ["review", "archived"],
  review: ["approved", "draft", "archived"],
  approved: ["scheduled", "running", "draft", "archived"],
  scheduled: ["running", "approved", "archived"],
  running: ["completed", "approved", "archived"],
  completed: ["archived", "draft"],
  archived: ["draft"],
};

export const WORKFLOW_ORDER: WorkflowState[] = [
  "draft",
  "review",
  "approved",
  "scheduled",
  "running",
  "completed",
  "archived",
];
