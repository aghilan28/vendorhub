// KARTEX M4 — SECIS (System Evolution & Change Impact System) domain model.
// 19 first-class entities. Framework-agnostic and browser-safe (no Node imports).

export type ISODate = string;

export type SecisRole = "owner" | "editor" | "analyst" | "viewer";
export type PlatformRole = "admin" | "analyst" | "operator" | "viewer";
export type Visibility = "private" | "team" | "organization";

// ── Workflow ────────────────────────────────────────────────────────────────

export type WorkflowState = "draft" | "review" | "approved" | "running" | "completed" | "archived";

export const WORKFLOW_ORDER: WorkflowState[] = ["draft", "review", "approved", "running", "completed", "archived"];

export const WORKFLOW_TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
  draft: ["review", "archived"],
  review: ["approved", "draft", "archived"],
  approved: ["running", "draft", "archived"],
  running: ["completed", "approved", "archived"],
  completed: ["archived", "draft"],
  archived: ["draft"],
};

// ── 1. Entity (a node in the system graph) ───────────────────────────────────

export type EntityKind =
  | "supplier"
  | "warehouse"
  | "dark_store"
  | "store"
  | "product"
  | "category"
  | "courier"
  | "delivery_zone"
  | "customer_segment"
  | "payment_gateway"
  | "pricing_engine"
  | "marketing_channel"
  | "inventory_node";

export interface SecisEntity {
  id: string;
  name: string;
  kind: EntityKind;
  systemId: string;
  subsystemId?: string;
  criticality: number; // 0..1 — how essential this node is
  vulnerability: number; // 0..1 — how strongly it amplifies incoming shock
  resilience: number; // 0..1 — recovery speed after a shock
  monthlyRevenueExposure: number; // ₹ exposed if this node degrades
  tags: string[];
  status: "active" | "archived";
  ownerId: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

// ── 2. System / 3. Subsystem ─────────────────────────────────────────────────

export interface SecisSystem {
  id: string;
  name: string;
  description: string;
  domain: string; // e.g. "Supply", "Fulfilment"
  criticality: number; // 0..1
  status: "active" | "archived";
  ownerId: string;
  ownerName: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface SecisSubsystem {
  id: string;
  systemId: string;
  name: string;
  description: string;
}

// ── 4. Dependency / 5. Relationship (graph edges) ────────────────────────────

export type EdgeCategory = "dependency" | "relationship";
export type EdgeType =
  | "supplies"
  | "stocks"
  | "fulfils"
  | "delivers_to"
  | "lists_in"
  | "prices"
  | "pays_via"
  | "promotes"
  | "depends_on"
  | "serves";

export interface SecisEdge {
  id: string;
  sourceId: string; // upstream node (shock originates upstream, flows to target)
  targetId: string; // downstream node that depends on the source
  category: EdgeCategory;
  type: EdgeType;
  weight: number; // 0..1 — strength of coupling / transmission
  description?: string;
  createdAt: ISODate;
}

// ── 6. Change Event ──────────────────────────────────────────────────────────

export type ChangeEventType =
  | "supplier_failure"
  | "demand_surge"
  | "inventory_shock"
  | "price_change"
  | "delivery_failure"
  | "store_closure"
  | "competitor_entry"
  | "policy_change"
  | "custom";

export interface ChangeEvent {
  id: string;
  name: string;
  type: ChangeEventType;
  description: string;
  originEntityId: string;
  magnitude: number; // 0..1 — shock intensity at origin
  horizonPeriods: number; // periods analysed
  parameters: Record<string, number | string>;
  tags: string[];
  ownerId: string;
  ownerName: string;
  visibility: Visibility;
  workflowState: WorkflowState;
  version: number;
  status: "active" | "archived";
  createdAt: ISODate;
  updatedAt: ISODate;
  lastAnalyzedAt?: ISODate;
}

// ── 7. Impact Event (per-entity impact produced by propagation) ──────────────

export interface ImpactEvent {
  entityId: string;
  entityName: string;
  entityKind: EntityKind;
  systemId: string;
  depth: number; // hops from origin
  severity: number; // 0..1 severity arriving at this node
  arrivalPeriod: number; // when the shock reaches this node
  revenueAtRisk: number; // ₹
}

// ── 8. Propagation Path ──────────────────────────────────────────────────────

export interface PropagationPath {
  nodeIds: string[]; // origin → … → node
  labels: string[];
  edgeTypes: EdgeType[];
  terminalSeverity: number;
}

export interface PropagationResult {
  originEntityId: string;
  affected: ImpactEvent[]; // includes the origin at depth 0
  paths: PropagationPath[];
  affectedSystemIds: string[];
  maxDepth: number;
  totalRevenueAtRisk: number;
  timeline: Array<{ period: number; cumulativeSeverity: number; newlyAffected: number }>;
}

// ── 9. Risk Event ────────────────────────────────────────────────────────────

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface RiskEvent {
  id: string;
  entityId: string;
  entityName: string;
  label: string;
  level: RiskLevel;
  score: number; // 0..100
  category: "dependency" | "propagation" | "operational" | "financial";
  detail: string;
}

// ── 10. Impact Assessment (multi-dimensional aggregate) ──────────────────────

export type ImpactDimension =
  | "operational"
  | "financial"
  | "inventory"
  | "demand"
  | "supply"
  | "delivery"
  | "customer"
  | "marketplace";

export interface DimensionImpact {
  dimension: ImpactDimension;
  label: string;
  score: number; // 0..100
  value: string; // human-readable (₹ or %)
  level: RiskLevel;
  detail: string;
}

export interface ImpactAssessment {
  changeEventId: string;
  headlineValue: string;
  totalRevenueAtRisk: number;
  affectedEntities: number;
  affectedSystems: number;
  dimensions: DimensionImpact[];
  outcomeSummary: string;
}

// ── 11. Risk Assessment ──────────────────────────────────────────────────────

export interface RiskAssessment {
  changeEventId: string;
  level: RiskLevel;
  score: number; // 0..100
  events: RiskEvent[];
  factors: Array<{ label: string; level: RiskLevel; detail: string }>;
}

// ── 12. Recommendation ───────────────────────────────────────────────────────

export type RecommendationCategory =
  | "mitigation"
  | "intervention"
  | "recovery"
  | "optimization"
  | "strategic"
  | "operational";

export interface Recommendation {
  id: string;
  changeEventId: string;
  category: RecommendationCategory;
  title: string;
  action: string;
  rationale: string;
  expectedImpact: string;
  priority: "low" | "medium" | "high";
  interventionId?: string;
  accepted?: boolean;
  createdAt: ISODate;
}

// ── 13. Intervention (catalog item applied in evolution) ─────────────────────

export interface Intervention {
  id: string;
  name: string;
  description: string;
  category: RecommendationCategory;
  appliesTo: ChangeEventType[]; // event types it is relevant to
  severityReduction: number; // 0..1 — reduces arriving severity
  recoveryBoost: number; // 0..1 — speeds recovery
  cost: number; // ₹
}

// ── 14. Scenario (saved event + interventions + constraints) ─────────────────

export interface SecisScenario {
  id: string;
  name: string;
  description: string;
  changeEventId: string;
  interventionIds: string[];
  constraintIds: string[];
  ownerId: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

// ── 15. Decision ─────────────────────────────────────────────────────────────

export type DecisionOutcome = "adopt" | "reject" | "defer" | "escalate";

export interface SecisDecision {
  id: string;
  changeEventId?: string;
  evolutionRunId?: string;
  title: string;
  outcome: DecisionOutcome;
  rationale: string;
  decidedBy: string;
  impact: "low" | "medium" | "high";
  createdAt: ISODate;
}

// ── 16. Constraint ───────────────────────────────────────────────────────────

export type ConstraintOperator = "lte" | "gte";

export interface SecisConstraint {
  id: string;
  label: string;
  dimension: ImpactDimension | "risk";
  operator: ConstraintOperator;
  threshold: number;
}

// ── 17. Mitigation (an applied/tracked mitigation action) ────────────────────

export interface Mitigation {
  id: string;
  changeEventId: string;
  interventionId: string;
  name: string;
  status: "proposed" | "applied" | "verified";
  appliedBy: string;
  note: string;
  createdAt: ISODate;
}

// ── 18. Evolution Run ────────────────────────────────────────────────────────

export type RunStatus = "queued" | "running" | "paused" | "completed" | "cancelled";

export interface RunLogEntry {
  at: ISODate;
  level: "info" | "warn" | "error";
  message: string;
}

export interface EvolutionRun {
  id: string;
  changeEventId: string;
  changeEventName: string;
  scenarioId?: string;
  name: string;
  interventionIds: string[];
  status: RunStatus;
  progress: number;
  startedAt: ISODate;
  completedAt?: ISODate;
  runtimeMs: number;
  triggeredBy: string;
  logs: RunLogEntry[];
  result?: EvolutionResult;
}

// ── 19. Evolution Result ─────────────────────────────────────────────────────

export interface EvolutionSeriesPoint {
  x: number;
  y: number;
}

export interface EvolutionResult {
  baselineSeries: EvolutionSeriesPoint[]; // system health, no action
  interventionSeries: EvolutionSeriesPoint[]; // system health, with interventions
  severitySeries: EvolutionSeriesPoint[]; // shock severity over time
  kpis: Array<{ key: string; label: string; value: number; display: string; tone: "success" | "warning" | "danger" | "info" | "neutral" }>;
  recoveryPeriodBaseline: number;
  recoveryPeriodIntervention: number;
  resilienceScore: number; // 0..100
  residualImpactPct: number;
  avoidedLoss: number; // ₹
  interventionCost: number; // ₹
  evolutionEvents: Array<{ period: number; label: string; kind: "shock" | "intervention" | "recovery" | "milestone" }>;
  outcomeSummary: string;
}

// ── Users / RBAC ─────────────────────────────────────────────────────────────

export interface SecisUser {
  id: string;
  name: string;
  role: PlatformRole;
}

export type Permission =
  | "entity.manage"
  | "system.manage"
  | "event.create"
  | "event.run"
  | "decision.record"
  | "mitigation.apply"
  | "approval.record"
  | "settings.manage";

// ── Settings ─────────────────────────────────────────────────────────────────

export interface SecisSettings {
  severityThreshold: number; // 0..1 — propagation cutoff
  maxDepth: number;
  defaultHorizon: number;
  defaultVisibility: Visibility;
  autoGenerateRecommendations: boolean;
}

// ── History / Audit ──────────────────────────────────────────────────────────

export type HistoryAction =
  | "entity_created"
  | "entity_updated"
  | "entity_archived"
  | "system_created"
  | "edge_created"
  | "edge_removed"
  | "event_created"
  | "event_updated"
  | "event_analyzed"
  | "event_archived"
  | "evolution_started"
  | "evolution_completed"
  | "evolution_cancelled"
  | "recommendation_accepted"
  | "mitigation_applied"
  | "decision_recorded"
  | "workflow_transition"
  | "approval_recorded"
  | "scenario_created";

export interface SecisHistoryEvent {
  id: string;
  action: HistoryAction;
  changeEventId?: string;
  entityId?: string;
  systemId?: string;
  runId?: string;
  actorId: string;
  actorName: string;
  summary: string;
  meta?: Record<string, string | number>;
  at: ISODate;
}
