// KARTEX M5 — Governance Operating System domain model.
// 22 first-class entities. Framework-agnostic and browser-safe.

export type ISODate = string;

// ── Roles / permissions ──────────────────────────────────────────────────────

export type PlatformRole = "governance_admin" | "policy_owner" | "reviewer" | "approver" | "auditor" | "viewer";
export type Visibility = "private" | "team" | "organization";

// ── Source systems (integration with M1–M4) ─────────────────────────────────

export type SourceSystem = "research" | "knowledge" | "simulation" | "secis" | "marketplace" | "internal";

// ── Workflow states ──────────────────────────────────────────────────────────

export type PolicyStatus = "draft" | "review" | "approved" | "published" | "archived";
export type DecisionStatus = "draft" | "review" | "approved" | "rejected" | "exception" | "archived";
export type ExceptionStatus = "requested" | "review" | "approved" | "rejected" | "expired" | "archived";
export type RiskStatus = "open" | "mitigating" | "resolved" | "accepted";
export type CheckStatus = "pass" | "fail" | "warning" | "not_assessed";

export type Severity = "low" | "medium" | "high" | "critical";
export type Likelihood = "rare" | "unlikely" | "possible" | "likely" | "almost_certain";
export type Priority = "low" | "medium" | "high";

// ── 1. Policy / 2. PolicyRule / 3. PolicyCategory ────────────────────────────

export type RuleType = "mandatory" | "advisory";

export interface PolicyRule {
  id: string;
  statement: string;
  type: RuleType;
  severityIfViolated: Severity;
  controlId?: string;
}

export interface PolicyCategoryDef {
  id: string;
  name: string;
  description: string;
}

export interface Policy {
  id: string;
  title: string;
  summary: string;
  category: string;
  status: PolicyStatus;
  version: number;
  rules: PolicyRule[];
  ownerId: string;
  ownerName: string;
  reviewerIds: string[];
  approverIds: string[];
  appliesToSystems: SourceSystem[];
  controlIds: string[];
  tags: string[];
  visibility: Visibility;
  effectiveDate?: ISODate;
  createdAt: ISODate;
  updatedAt: ISODate;
}

// ── 4. PolicyVersion ─────────────────────────────────────────────────────────

export interface PolicyVersion {
  id: string;
  policyId: string;
  version: number;
  label: string;
  authorId: string;
  authorName: string;
  createdAt: ISODate;
  snapshot: { title: string; summary: string; ruleCount: number; status: PolicyStatus };
}

// ── 5. Decision ──────────────────────────────────────────────────────────────

export type DecisionType = "operational" | "strategic" | "policy_change" | "exception" | "remediation" | "investment";
export type DecisionOutcome = "pending" | "adopted" | "rejected" | "deferred";

export interface Decision {
  id: string;
  title: string;
  description: string;
  type: DecisionType;
  sourceSystem: SourceSystem;
  sourceRef?: string; // free-text/link to the originating item (e.g. SECIS event id)
  ownerId: string;
  ownerName: string;
  accountableId: string; // who is accountable for the outcome
  accountableName: string;
  reviewerIds: string[];
  approverIds: string[];
  status: DecisionStatus;
  impact: Priority;
  riskScore: number; // 0..100
  relatedPolicyIds: string[];
  outcome: DecisionOutcome;
  outcomeNote?: string;
  tags: string[];
  dueDate?: ISODate;
  createdAt: ISODate;
  updatedAt: ISODate;
}

// ── 6. DecisionReview ────────────────────────────────────────────────────────

export type ReviewVerdict = "approve" | "request_changes" | "reject" | "comment";

export interface DecisionReview {
  id: string;
  decisionId: string;
  reviewerId: string;
  reviewerName: string;
  verdict: ReviewVerdict;
  comment: string;
  createdAt: ISODate;
}

// ── 7. DecisionApproval / 8. DecisionRejection ───────────────────────────────
// A single record models both: approved=true → approval, approved=false → rejection.

export interface DecisionApproval {
  id: string;
  decisionId: string;
  approverId: string;
  approverName: string;
  approved: boolean;
  note: string;
  createdAt: ISODate;
}

// ── 9. DecisionOwner (ownership / accountability assignment) ─────────────────

export interface OwnershipRef {
  userId: string;
  name: string;
  role: "owner" | "accountable" | "reviewer" | "approver";
}

// ── 10. GovernanceWorkflow (lifecycle definition) ────────────────────────────

export interface WorkflowDefinition {
  id: string;
  name: string;
  objectType: "policy" | "decision" | "exception";
  states: string[];
  transitions: Record<string, string[]>;
}

// ── 11. GovernanceAction / 12. GovernanceEvent / 16. AuditRecord ─────────────
// Unified audit stream. 17. AuditTrail = AuditRecord[].

export type AuditAction =
  | "policy_created"
  | "policy_updated"
  | "policy_versioned"
  | "policy_transition"
  | "policy_archived"
  | "decision_created"
  | "decision_updated"
  | "decision_review"
  | "decision_approved"
  | "decision_rejected"
  | "decision_escalated"
  | "decision_transition"
  | "risk_created"
  | "risk_updated"
  | "risk_mitigation_assigned"
  | "risk_resolved"
  | "control_updated"
  | "compliance_check_run"
  | "exception_requested"
  | "exception_review"
  | "exception_approved"
  | "exception_rejected"
  | "exception_expired"
  | "report_generated"
  | "recommendation_accepted"
  | "settings_updated";

export type AuditObjectType = "policy" | "decision" | "risk" | "control" | "check" | "exception" | "report" | "settings";

export interface AuditRecord {
  id: string;
  action: AuditAction;
  objectType: AuditObjectType;
  objectId?: string;
  objectLabel?: string;
  actorId: string;
  actorName: string;
  summary: string; // what + why
  reason?: string;
  changes?: Array<{ field: string; from: string; to: string }>;
  at: ISODate;
}

export type AuditTrail = AuditRecord[];

// ── 13. GovernanceRisk ───────────────────────────────────────────────────────

export interface RiskHistoryEntry {
  at: ISODate;
  note: string;
  actorName: string;
}

export interface GovernanceRisk {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: Severity;
  likelihood: Likelihood;
  score: number; // 0..100
  status: RiskStatus;
  ownerId: string;
  ownerName: string;
  mitigationPlan: string;
  relatedPolicyIds: string[];
  history: RiskHistoryEntry[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

// ── 14. GovernanceControl ────────────────────────────────────────────────────

export type ControlType = "preventive" | "detective" | "corrective";

export interface GovernanceControl {
  id: string;
  name: string;
  description: string;
  type: ControlType;
  ownerId: string;
  ownerName: string;
  policyIds: string[];
}

// ── 15. ComplianceCheck ──────────────────────────────────────────────────────

export interface ComplianceCheck {
  id: string;
  title: string;
  controlId: string;
  policyId?: string;
  status: CheckStatus;
  evidence: string;
  ownerId: string;
  ownerName: string;
  lastCheckedAt: ISODate;
}

// ── 18. ExceptionRequest / 19. ExceptionApproval ─────────────────────────────

export interface ExceptionRequest {
  id: string;
  title: string;
  policyId: string;
  policyTitle: string;
  reason: string;
  requestedById: string;
  requestedByName: string;
  status: ExceptionStatus;
  expiresAt?: ISODate;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface ExceptionApproval {
  id: string;
  exceptionId: string;
  approverId: string;
  approverName: string;
  approved: boolean;
  note: string;
  createdAt: ISODate;
}

// ── 20. GovernanceRecommendation ─────────────────────────────────────────────

export type RecommendationKind = "gap" | "risk" | "overdue" | "compliance" | "ownership";

export interface GovernanceRecommendation {
  id: string;
  kind: RecommendationKind;
  title: string;
  detail: string;
  priority: Priority;
  objectType?: AuditObjectType;
  objectId?: string;
}

// ── 21. GovernanceReport ─────────────────────────────────────────────────────

export type ReportKind = "policy" | "decision" | "risk" | "compliance" | "audit";

export interface ReportSection {
  heading: string;
  rows: string[][];
  columns: string[];
}

export interface GovernanceReport {
  id: string;
  kind: ReportKind;
  title: string;
  generatedById: string;
  generatedByName: string;
  generatedAt: ISODate;
  summary: string;
  metrics: Array<{ label: string; value: string }>;
  sections: ReportSection[];
}

// ── 22. GovernanceDashboard (computed analytics) ─────────────────────────────

export interface GovernanceDashboard {
  policies: number;
  publishedPolicies: number;
  draftPolicies: number;
  decisions: number;
  pendingReviews: number;
  pendingApprovals: number;
  pendingExceptions: number;
  openRisks: number;
  criticalRisks: number;
  complianceScore: number;
  controlCoverage: number;
  auditEvents: number;
}

// ── Users / settings ─────────────────────────────────────────────────────────

export interface GovernanceUser {
  id: string;
  name: string;
  role: PlatformRole;
}

export type Permission =
  | "policy.manage"
  | "policy.approve"
  | "decision.create"
  | "decision.review"
  | "decision.approve"
  | "risk.manage"
  | "exception.request"
  | "exception.approve"
  | "report.generate"
  | "settings.manage";

export interface GovernanceSettings {
  requireTwoApprovals: boolean;
  defaultVisibility: Visibility;
  exceptionDefaultDays: number;
  complianceTargetPct: number;
  autoGenerateRecommendations: boolean;
}
