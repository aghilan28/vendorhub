"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  buildReport,
  generateRecommendations,
  scoreRisk,
  type AuditAction,
  type AuditObjectType,
  type AuditRecord,
  type ComplianceCheck,
  type Decision,
  type DecisionApproval,
  type DecisionReview,
  type DecisionStatus,
  type DecisionType,
  type ExceptionApproval,
  type ExceptionRequest,
  type ExceptionStatus,
  type GovernanceControl,
  type GovernanceReport,
  type GovernanceRisk,
  type GovernanceSettings,
  type GovernanceUser,
  type Likelihood,
  type Policy,
  type PolicyRule,
  type PolicyStatus,
  type PolicyVersion,
  type ReportKind,
  type ReviewVerdict,
  type RiskStatus,
  type Severity,
  type SourceSystem,
} from "@/lib/governance-os";

// ── id + time helpers ─────────────────────────────────────────────────────────

let counter = 0;
function uid(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}
function now(): string {
  return new Date().toISOString();
}
const SEED_BASE = Date.parse("2026-05-18T09:00:00.000Z");
function seedTime(min: number): string {
  return new Date(SEED_BASE + min * 60_000).toISOString();
}
function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

// ── Users / settings ──────────────────────────────────────────────────────────

const SEED_USERS: GovernanceUser[] = [
  { id: "g_anita", name: "Anita Desai", role: "governance_admin" },
  { id: "g_vikram", name: "Vikram Rao", role: "approver" },
  { id: "g_leela", name: "Leela Nair", role: "reviewer" },
  { id: "g_sara", name: "Sara Imam", role: "policy_owner" },
  { id: "g_tomas", name: "Tomás Field", role: "auditor" },
  { id: "g_joe", name: "Joe Verma", role: "viewer" },
];

const DEFAULT_SETTINGS: GovernanceSettings = {
  requireTwoApprovals: false,
  defaultVisibility: "team",
  exceptionDefaultDays: 30,
  complianceTargetPct: 90,
  autoGenerateRecommendations: true,
};

// ── Seed builders ─────────────────────────────────────────────────────────────

function rule(id: string, statement: string, type: PolicyRule["type"], severity: Severity, controlId?: string): PolicyRule {
  return { id, statement, type, severityIfViolated: severity, controlId };
}

const SEED_POLICIES: Policy[] = [
  {
    id: "pol-retention",
    title: "Data Retention Standard",
    summary: "How long marketplace and knowledge data is retained, and when it must be deleted.",
    category: "data",
    status: "published",
    version: 2,
    rules: [
      rule("pol-retention-r1", "Personal data must be deleted within 24 months of last activity.", "mandatory", "high", "ctrl-retention"),
      rule("pol-retention-r2", "Aggregated analytics may be retained indefinitely if anonymised.", "advisory", "low"),
    ],
    ownerId: "g_sara",
    ownerName: "Sara Imam",
    reviewerIds: ["g_leela"],
    approverIds: ["g_vikram"],
    appliesToSystems: ["marketplace", "knowledge", "internal"],
    controlIds: ["ctrl-retention"],
    tags: ["privacy", "retention"],
    visibility: "organization",
    effectiveDate: seedTime(0),
    createdAt: seedTime(0),
    updatedAt: seedTime(120),
  },
  {
    id: "pol-model",
    title: "Model Use & Automated Decisions",
    summary: "Governs use of simulations, forecasts, and automated decisions in production.",
    category: "model",
    status: "published",
    version: 1,
    rules: [
      rule("pol-model-r1", "Models affecting pricing or customers require documented review before production.", "mandatory", "high", "ctrl-model-review"),
      rule("pol-model-r2", "Automated decisions must be reversible and auditable.", "mandatory", "high"),
    ],
    ownerId: "g_sara",
    ownerName: "Sara Imam",
    reviewerIds: ["g_leela"],
    approverIds: ["g_vikram"],
    appliesToSystems: ["simulation", "secis", "research"],
    controlIds: ["ctrl-model-review"],
    tags: ["ai", "models"],
    visibility: "organization",
    effectiveDate: seedTime(10),
    createdAt: seedTime(10),
    updatedAt: seedTime(60),
  },
  {
    id: "pol-spend",
    title: "Spend Authority Matrix",
    summary: "Approval authority required for spend at each threshold.",
    category: "financial",
    status: "published",
    version: 1,
    rules: [
      rule("pol-spend-r1", "Spend above ₹5,00,000 requires approver sign-off.", "mandatory", "high", "ctrl-spend"),
      rule("pol-spend-r2", "Spend above ₹25,00,000 requires two approvals.", "mandatory", "critical", "ctrl-spend"),
    ],
    ownerId: "g_anita",
    ownerName: "Anita Desai",
    reviewerIds: ["g_leela"],
    approverIds: ["g_vikram", "g_anita"],
    appliesToSystems: ["internal", "marketplace"],
    controlIds: ["ctrl-spend"],
    tags: ["finance", "approval"],
    visibility: "organization",
    effectiveDate: seedTime(20),
    createdAt: seedTime(20),
    updatedAt: seedTime(20),
  },
  {
    id: "pol-vendor",
    title: "Vendor Conduct Policy",
    summary: "Standards for vendor onboarding, conduct, and enforcement.",
    category: "vendor",
    status: "published",
    version: 1,
    rules: [rule("pol-vendor-r1", "Vendors must maintain a trust score above the restricted threshold.", "mandatory", "medium", "ctrl-vendor")],
    ownerId: "g_sara",
    ownerName: "Sara Imam",
    reviewerIds: ["g_leela"],
    approverIds: ["g_vikram"],
    appliesToSystems: ["marketplace"],
    controlIds: ["ctrl-vendor"],
    tags: ["vendor"],
    visibility: "organization",
    effectiveDate: seedTime(30),
    createdAt: seedTime(30),
    updatedAt: seedTime(30),
  },
  {
    id: "pol-change",
    title: "Change Approval Policy",
    summary: "How operational and supply-chain changes are approved before execution.",
    category: "operational",
    status: "review",
    version: 1,
    rules: [rule("pol-change-r1", "High-impact change events must be approved before mitigation is executed.", "mandatory", "high")],
    ownerId: "g_sara",
    ownerName: "Sara Imam",
    reviewerIds: ["g_leela"],
    approverIds: ["g_vikram"],
    appliesToSystems: ["secis", "internal"],
    controlIds: [],
    tags: ["change", "secis"],
    visibility: "team",
    createdAt: seedTime(40),
    updatedAt: seedTime(45),
  },
  {
    id: "pol-access",
    title: "Security Access Baseline",
    summary: "Minimum access-control standards for governed systems.",
    category: "security",
    status: "draft",
    version: 1,
    rules: [rule("pol-access-r1", "Privileged access requires approval and expires automatically.", "mandatory", "critical", "ctrl-access")],
    ownerId: "g_anita",
    ownerName: "Anita Desai",
    reviewerIds: [],
    approverIds: [],
    appliesToSystems: ["internal"],
    controlIds: ["ctrl-access"],
    tags: ["security"],
    visibility: "team",
    createdAt: seedTime(50),
    updatedAt: seedTime(50),
  },
];

const SEED_POLICY_VERSIONS: PolicyVersion[] = [
  { id: "pv-retention-1", policyId: "pol-retention", version: 1, label: "Initial standard", authorId: "g_sara", authorName: "Sara Imam", createdAt: seedTime(0), snapshot: { title: "Data Retention Standard", summary: "Initial retention rules", ruleCount: 1, status: "published" } },
  { id: "pv-retention-2", policyId: "pol-retention", version: 2, label: "Added anonymised-analytics clause", authorId: "g_sara", authorName: "Sara Imam", createdAt: seedTime(120), snapshot: { title: "Data Retention Standard", summary: "How long marketplace and knowledge data is retained.", ruleCount: 2, status: "published" } },
];

const SEED_CONTROLS: GovernanceControl[] = [
  { id: "ctrl-retention", name: "Retention sweep", description: "Automated detection of data past its retention window.", type: "detective", ownerId: "g_sara", ownerName: "Sara Imam", policyIds: ["pol-retention"] },
  { id: "ctrl-model-review", name: "Model review gate", description: "Required review before a model reaches production.", type: "preventive", ownerId: "g_sara", ownerName: "Sara Imam", policyIds: ["pol-model"] },
  { id: "ctrl-spend", name: "Spend approval gate", description: "Approval enforcement at spend thresholds.", type: "preventive", ownerId: "g_anita", ownerName: "Anita Desai", policyIds: ["pol-spend"] },
  { id: "ctrl-vendor", name: "Vendor trust monitor", description: "Continuous monitoring of vendor trust scores.", type: "corrective", ownerId: "g_sara", ownerName: "Sara Imam", policyIds: ["pol-vendor"] },
  { id: "ctrl-access", name: "Privileged access expiry", description: "Auto-expiry of privileged grants.", type: "preventive", ownerId: "g_anita", ownerName: "Anita Desai", policyIds: ["pol-access"] },
];

const SEED_CHECKS: ComplianceCheck[] = [
  { id: "chk-1", title: "Retention sweep ran in last 30 days", controlId: "ctrl-retention", policyId: "pol-retention", status: "pass", evidence: "Sweep job completed 2026-05-20.", ownerId: "g_sara", ownerName: "Sara Imam", lastCheckedAt: seedTime(200) },
  { id: "chk-2", title: "All production models have documented review", controlId: "ctrl-model-review", policyId: "pol-model", status: "warning", evidence: "1 model pending review.", ownerId: "g_leela", ownerName: "Leela Nair", lastCheckedAt: seedTime(210) },
  { id: "chk-3", title: "Spend approvals enforced at threshold", controlId: "ctrl-spend", policyId: "pol-spend", status: "pass", evidence: "All spend > ₹5L had approvals.", ownerId: "g_vikram", ownerName: "Vikram Rao", lastCheckedAt: seedTime(220) },
  { id: "chk-4", title: "No vendors below restricted threshold unactioned", controlId: "ctrl-vendor", policyId: "pol-vendor", status: "fail", evidence: "2 restricted vendors without enforcement.", ownerId: "g_sara", ownerName: "Sara Imam", lastCheckedAt: seedTime(230) },
  { id: "chk-5", title: "Privileged grants expire automatically", controlId: "ctrl-access", policyId: "pol-access", status: "not_assessed", evidence: "Policy still in draft.", ownerId: "g_anita", ownerName: "Anita Desai", lastCheckedAt: seedTime(50) },
  { id: "chk-6", title: "Automated decisions are reversible", controlId: "ctrl-model-review", policyId: "pol-model", status: "pass", evidence: "Reversal paths verified for SECIS mitigations.", ownerId: "g_leela", ownerName: "Leela Nair", lastCheckedAt: seedTime(215) },
];

function risk(id: string, title: string, description: string, category: string, severity: Severity, likelihood: Likelihood, status: RiskStatus, ownerId: string, ownerName: string, mitigationPlan: string, relatedPolicyIds: string[], createdMin: number): GovernanceRisk {
  return { id, title, description, category, severity, likelihood, score: scoreRisk(severity, likelihood), status, ownerId, ownerName, mitigationPlan, relatedPolicyIds, history: [{ at: seedTime(createdMin), note: "Risk registered", actorName: ownerName }], createdAt: seedTime(createdMin), updatedAt: seedTime(createdMin) };
}

const SEED_RISKS: GovernanceRisk[] = [
  risk("risk-supplier", "Single-supplier dependency (dairy)", "SECIS analysis shows a dairy outage cascades across fulfilment.", "Operational", "high", "likely", "mitigating", "g_vikram", "Vikram Rao", "Qualify a backup supplier and hold safety stock.", ["pol-change"], 60),
  risk("risk-modeldrift", "Model drift in pricing engine", "Pricing model may drift from market reality over time.", "Model", "medium", "possible", "mitigating", "g_sara", "Sara Imam", "Monthly recalibration and monitoring.", ["pol-model"], 70),
  risk("risk-pii", "PII over-retention", "Personal data may be retained beyond policy.", "Compliance", "high", "possible", "open", "g_sara", "Sara Imam", "", ["pol-retention"], 80),
  risk("risk-fraud", "Payout fraud exposure", "Fraudulent payout requests could bypass controls.", "Financial", "critical", "unlikely", "mitigating", "g_vikram", "Vikram Rao", "Dual approval and anomaly detection on payouts.", ["pol-spend"], 90),
  risk("risk-reputation", "Reputational risk from delivery failures", "Repeated delivery failures damage brand trust.", "Reputational", "medium", "possible", "open", "g_anita", "Anita Desai", "", ["pol-vendor"], 100),
];

function decision(
  id: string,
  title: string,
  description: string,
  type: DecisionType,
  sourceSystem: SourceSystem,
  status: DecisionStatus,
  ownerId: string,
  ownerName: string,
  accountableId: string,
  accountableName: string,
  reviewerIds: string[],
  approverIds: string[],
  impact: "low" | "medium" | "high",
  relatedPolicyIds: string[],
  outcome: Decision["outcome"],
  createdMin: number,
  sourceRef?: string,
): Decision {
  return {
    id,
    title,
    description,
    type,
    sourceSystem,
    sourceRef,
    ownerId,
    ownerName,
    accountableId,
    accountableName,
    reviewerIds,
    approverIds,
    status,
    impact,
    riskScore: impact === "high" ? 72 : impact === "medium" ? 48 : 24,
    relatedPolicyIds,
    outcome,
    tags: [],
    dueDate: status === "review" ? daysFromNow(createdMin % 2 === 0 ? -1 : 5) : undefined,
    createdAt: seedTime(createdMin),
    updatedAt: seedTime(createdMin + 5),
  };
}

const SEED_DECISIONS: Decision[] = [
  decision("dec-pricing", "Adopt optimised festive price", "Simulation OS shows profit headroom from a festive repricing.", "strategic", "simulation", "approved", "g_sara", "Sara Imam", "g_vikram", "Vikram Rao", ["g_leela"], ["g_vikram"], "high", ["pol-spend", "pol-model"], "adopted", 110, "simulation:sim_pricing"),
  decision("dec-backup", "Activate backup supplier for dairy outage", "SECIS recommends a backup-supplier response to the dairy outage.", "remediation", "secis", "approved", "g_vikram", "Vikram Rao", "g_anita", "Anita Desai", ["g_leela"], ["g_vikram"], "high", ["pol-change"], "adopted", 120, "secis:ce-supplier"),
  decision("dec-model", "Publish demand-forecast model to production", "Promote the demand-forecast model from Knowledge OS to production.", "policy_change", "knowledge", "review", "g_sara", "Sara Imam", "g_sara", "Sara Imam", ["g_leela"], ["g_vikram"], "medium", ["pol-model"], "pending", 130, "knowledge:demand-forecast"),
  decision("dec-budget", "Increase paid acquisition budget by 30%", "Marketplace growth proposal to raise acquisition spend.", "investment", "marketplace", "review", "g_anita", "Anita Desai", "g_anita", "Anita Desai", [], ["g_vikram", "g_anita"], "high", ["pol-spend"], "pending", 140),
  decision("dec-legacy", "Retire legacy supplier integration", "Decommission the legacy supplier API.", "operational", "internal", "draft", "g_sara", "Sara Imam", "g_sara", "Sara Imam", [], [], "low", [], "pending", 150),
];

const SEED_REVIEWS: DecisionReview[] = [
  { id: "rev-pricing-1", decisionId: "dec-pricing", reviewerId: "g_leela", reviewerName: "Leela Nair", verdict: "approve", comment: "Elasticity assumptions are sound.", createdAt: seedTime(112) },
  { id: "rev-model-1", decisionId: "dec-model", reviewerId: "g_leela", reviewerName: "Leela Nair", verdict: "request_changes", comment: "Add a rollback plan before approval.", createdAt: seedTime(132) },
];

const SEED_APPROVALS: DecisionApproval[] = [
  { id: "apr-pricing-1", decisionId: "dec-pricing", approverId: "g_vikram", approverName: "Vikram Rao", approved: true, note: "Approved for a controlled experiment.", createdAt: seedTime(114) },
  { id: "apr-backup-1", decisionId: "dec-backup", approverId: "g_vikram", approverName: "Vikram Rao", approved: true, note: "Approved given supply risk.", createdAt: seedTime(122) },
];

const SEED_EXCEPTIONS: ExceptionRequest[] = [
  { id: "exc-retention", title: "Retain audit logs beyond 24 months", policyId: "pol-retention", policyTitle: "Data Retention Standard", reason: "Regulatory audit requires extended retention of audit logs.", requestedById: "g_tomas", requestedByName: "Tomás Field", status: "approved", expiresAt: daysFromNow(60), createdAt: seedTime(160), updatedAt: seedTime(165) },
  { id: "exc-model", title: "Ship hotfix model without full review", policyId: "pol-model", policyTitle: "Model Use & Automated Decisions", reason: "Critical pricing bug requires an expedited model fix.", requestedById: "g_sara", requestedByName: "Sara Imam", status: "review", createdAt: seedTime(170), updatedAt: seedTime(170) },
];

const SEED_EXCEPTION_APPROVALS: ExceptionApproval[] = [
  { id: "exa-retention", exceptionId: "exc-retention", approverId: "g_vikram", approverName: "Vikram Rao", approved: true, note: "Approved for the audit window only.", createdAt: seedTime(165) },
];

const SEED_AUDIT: AuditRecord[] = [
  { id: "aud-1", action: "policy_created", objectType: "policy", objectId: "pol-retention", objectLabel: "Data Retention Standard", actorId: "g_sara", actorName: "Sara Imam", summary: "Created policy 'Data Retention Standard'", at: seedTime(0) },
  { id: "aud-2", action: "policy_versioned", objectType: "policy", objectId: "pol-retention", objectLabel: "Data Retention Standard", actorId: "g_sara", actorName: "Sara Imam", summary: "Published v2 (added anonymised-analytics clause)", reason: "Clarify analytics retention", at: seedTime(120) },
  { id: "aud-3", action: "decision_created", objectType: "decision", objectId: "dec-pricing", objectLabel: "Adopt optimised festive price", actorId: "g_sara", actorName: "Sara Imam", summary: "Created decision from Simulation OS", at: seedTime(110) },
  { id: "aud-4", action: "decision_approved", objectType: "decision", objectId: "dec-pricing", objectLabel: "Adopt optimised festive price", actorId: "g_vikram", actorName: "Vikram Rao", summary: "Approved decision", reason: "Controlled experiment", at: seedTime(114) },
  { id: "aud-5", action: "decision_created", objectType: "decision", objectId: "dec-backup", objectLabel: "Activate backup supplier for dairy outage", actorId: "g_vikram", actorName: "Vikram Rao", summary: "Created decision from SECIS", at: seedTime(120) },
  { id: "aud-6", action: "decision_approved", objectType: "decision", objectId: "dec-backup", objectLabel: "Activate backup supplier for dairy outage", actorId: "g_vikram", actorName: "Vikram Rao", summary: "Approved decision", at: seedTime(122) },
  { id: "aud-7", action: "risk_created", objectType: "risk", objectId: "risk-supplier", objectLabel: "Single-supplier dependency (dairy)", actorId: "g_vikram", actorName: "Vikram Rao", summary: "Registered operational risk", at: seedTime(60) },
  { id: "aud-8", action: "exception_requested", objectType: "exception", objectId: "exc-retention", objectLabel: "Retain audit logs beyond 24 months", actorId: "g_tomas", actorName: "Tomás Field", summary: "Requested retention exception", at: seedTime(160) },
  { id: "aud-9", action: "exception_approved", objectType: "exception", objectId: "exc-retention", objectLabel: "Retain audit logs beyond 24 months", actorId: "g_vikram", actorName: "Vikram Rao", summary: "Approved retention exception", reason: "Regulatory audit", at: seedTime(165) },
  { id: "aud-10", action: "compliance_check_run", objectType: "check", objectId: "chk-4", objectLabel: "Vendor enforcement check", actorId: "g_sara", actorName: "Sara Imam", summary: "Compliance check failed: 2 restricted vendors unactioned", at: seedTime(230) },
  { id: "aud-11", action: "decision_review", objectType: "decision", objectId: "dec-model", objectLabel: "Publish demand-forecast model to production", actorId: "g_leela", actorName: "Leela Nair", summary: "Requested changes: add a rollback plan", at: seedTime(132) },
  { id: "aud-12", action: "policy_transition", objectType: "policy", objectId: "pol-change", objectLabel: "Change Approval Policy", actorId: "g_sara", actorName: "Sara Imam", summary: "Workflow: draft → review", at: seedTime(45) },
];

// ── Store ──────────────────────────────────────────────────────────────────

export interface CreatePolicyInput {
  title: string;
  summary: string;
  category: string;
  appliesToSystems: SourceSystem[];
  rules: Array<Pick<PolicyRule, "statement" | "type" | "severityIfViolated">>;
  ownerId?: string;
  reviewerIds?: string[];
  approverIds?: string[];
  controlIds?: string[];
  tags?: string[];
}

export interface CreateDecisionInput {
  title: string;
  description: string;
  type: DecisionType;
  sourceSystem: SourceSystem;
  sourceRef?: string;
  accountableId?: string;
  reviewerIds?: string[];
  approverIds?: string[];
  impact: "low" | "medium" | "high";
  relatedPolicyIds?: string[];
  dueDate?: string;
}

export interface CreateRiskInput {
  title: string;
  description: string;
  category: string;
  severity: Severity;
  likelihood: Likelihood;
  ownerId?: string;
  mitigationPlan?: string;
  relatedPolicyIds?: string[];
}

interface GovernanceState {
  users: GovernanceUser[];
  currentUserId: string;
  settings: GovernanceSettings;
  policies: Policy[];
  policyVersions: PolicyVersion[];
  decisions: Decision[];
  decisionReviews: DecisionReview[];
  decisionApprovals: DecisionApproval[];
  risks: GovernanceRisk[];
  controls: GovernanceControl[];
  checks: ComplianceCheck[];
  exceptions: ExceptionRequest[];
  exceptionApprovals: ExceptionApproval[];
  acceptedRecommendationIds: string[];
  reports: GovernanceReport[];
  audit: AuditRecord[];

  setCurrentUser: (id: string) => void;

  createPolicy: (input: CreatePolicyInput) => string;
  updatePolicy: (id: string, patch: Partial<Pick<Policy, "title" | "summary" | "category" | "appliesToSystems" | "rules" | "reviewerIds" | "approverIds" | "controlIds" | "tags" | "ownerId" | "ownerName" | "visibility">>) => void;
  transitionPolicy: (id: string, to: PolicyStatus) => void;
  versionPolicy: (id: string, label: string) => void;
  archivePolicy: (id: string) => void;

  createDecision: (input: CreateDecisionInput) => string;
  updateDecision: (id: string, patch: Partial<Pick<Decision, "title" | "description" | "impact" | "reviewerIds" | "approverIds" | "relatedPolicyIds" | "dueDate" | "accountableId" | "accountableName">>) => void;
  transitionDecision: (id: string, to: DecisionStatus) => void;
  submitReview: (decisionId: string, verdict: ReviewVerdict, comment: string) => void;
  recordApproval: (decisionId: string, approved: boolean, note: string) => void;
  escalateDecision: (id: string) => void;
  setDecisionOutcome: (id: string, outcome: Decision["outcome"], note: string) => void;

  createRisk: (input: CreateRiskInput) => string;
  updateRisk: (id: string, patch: Partial<Pick<GovernanceRisk, "title" | "description" | "category" | "severity" | "likelihood" | "ownerId" | "ownerName" | "mitigationPlan" | "relatedPolicyIds">>) => void;
  setRiskStatus: (id: string, status: RiskStatus, note: string) => void;
  assignMitigation: (id: string, plan: string) => void;

  createControl: (input: { name: string; description: string; type: GovernanceControl["type"]; policyIds: string[] }) => void;
  createCheck: (input: { title: string; controlId: string; policyId?: string; evidence: string }) => void;
  runCheck: (id: string, status: ComplianceCheck["status"], evidence: string) => void;

  requestException: (input: { title: string; policyId: string; reason: string; days?: number }) => string;
  transitionException: (id: string, to: ExceptionStatus) => void;
  recordExceptionApproval: (exceptionId: string, approved: boolean, note: string) => void;

  acceptRecommendation: (id: string) => void;
  generateReport: (kind: ReportKind) => string;
  deleteReport: (id: string) => void;

  updateSettings: (patch: Partial<GovernanceSettings>) => void;
  resetToSeed: () => void;
}

function currentUser(s: GovernanceState): GovernanceUser {
  return s.users.find((u) => u.id === s.currentUserId) ?? s.users[0];
}

function audit(s: GovernanceState, action: AuditAction, objectType: AuditObjectType, summary: string, extra: Partial<Pick<AuditRecord, "objectId" | "objectLabel" | "reason" | "changes">> = {}): AuditRecord {
  const u = currentUser(s);
  return { id: uid("aud"), action, objectType, actorId: u.id, actorName: u.name, summary, at: now(), ...extra };
}

export const useGovernanceStore = create<GovernanceState>()(
  persist(
    (set, get) => ({
      users: SEED_USERS,
      currentUserId: "g_anita",
      settings: DEFAULT_SETTINGS,
      policies: SEED_POLICIES,
      policyVersions: SEED_POLICY_VERSIONS,
      decisions: SEED_DECISIONS,
      decisionReviews: SEED_REVIEWS,
      decisionApprovals: SEED_APPROVALS,
      risks: SEED_RISKS,
      controls: SEED_CONTROLS,
      checks: SEED_CHECKS,
      exceptions: SEED_EXCEPTIONS,
      exceptionApprovals: SEED_EXCEPTION_APPROVALS,
      acceptedRecommendationIds: [],
      reports: [],
      audit: SEED_AUDIT,

      setCurrentUser: (id) => set({ currentUserId: id }),

      createPolicy: (input) => {
        const id = uid("pol");
        const u = currentUser(get());
        const owner = input.ownerId ? get().users.find((x) => x.id === input.ownerId) : u;
        const policy: Policy = {
          id,
          title: input.title,
          summary: input.summary,
          category: input.category,
          status: "draft",
          version: 1,
          rules: input.rules.map((r, i) => ({ id: `${id}-r${i}`, statement: r.statement, type: r.type, severityIfViolated: r.severityIfViolated })),
          ownerId: owner?.id ?? u.id,
          ownerName: owner?.name ?? u.name,
          reviewerIds: input.reviewerIds ?? [],
          approverIds: input.approverIds ?? [],
          appliesToSystems: input.appliesToSystems,
          controlIds: input.controlIds ?? [],
          tags: input.tags ?? [],
          visibility: get().settings.defaultVisibility,
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ policies: [policy, ...s.policies], audit: [audit(s, "policy_created", "policy", `Created policy '${input.title}'`, { objectId: id, objectLabel: input.title }), ...s.audit] }));
        return id;
      },

      updatePolicy: (id, patch) =>
        set((s) => ({
          policies: s.policies.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: now() } : p)),
          audit: [audit(s, "policy_updated", "policy", `Updated policy`, { objectId: id, objectLabel: s.policies.find((p) => p.id === id)?.title }), ...s.audit],
        })),

      transitionPolicy: (id, to) =>
        set((s) => {
          const p = s.policies.find((x) => x.id === id);
          if (!p) return {};
          return {
            policies: s.policies.map((x) => (x.id === id ? { ...x, status: to, effectiveDate: to === "published" ? now() : x.effectiveDate, updatedAt: now() } : x)),
            audit: [audit(s, "policy_transition", "policy", `Workflow: ${p.status} → ${to}`, { objectId: id, objectLabel: p.title, changes: [{ field: "status", from: p.status, to }] }), ...s.audit],
          };
        }),

      versionPolicy: (id, label) =>
        set((s) => {
          const p = s.policies.find((x) => x.id === id);
          if (!p) return {};
          const version = p.version + 1;
          const u = currentUser(s);
          const pv: PolicyVersion = { id: uid("pv"), policyId: id, version, label, authorId: u.id, authorName: u.name, createdAt: now(), snapshot: { title: p.title, summary: p.summary, ruleCount: p.rules.length, status: p.status } };
          return {
            policyVersions: [pv, ...s.policyVersions],
            policies: s.policies.map((x) => (x.id === id ? { ...x, version, updatedAt: now() } : x)),
            audit: [audit(s, "policy_versioned", "policy", `Saved v${version}: ${label}`, { objectId: id, objectLabel: p.title }), ...s.audit],
          };
        }),

      archivePolicy: (id) =>
        set((s) => ({
          policies: s.policies.map((p) => (p.id === id ? { ...p, status: "archived", updatedAt: now() } : p)),
          audit: [audit(s, "policy_archived", "policy", `Archived policy`, { objectId: id, objectLabel: s.policies.find((p) => p.id === id)?.title }), ...s.audit],
        })),

      createDecision: (input) => {
        const id = uid("dec");
        const u = currentUser(get());
        const accountable = input.accountableId ? get().users.find((x) => x.id === input.accountableId) : u;
        const dec: Decision = {
          id,
          title: input.title,
          description: input.description,
          type: input.type,
          sourceSystem: input.sourceSystem,
          sourceRef: input.sourceRef,
          ownerId: u.id,
          ownerName: u.name,
          accountableId: accountable?.id ?? u.id,
          accountableName: accountable?.name ?? u.name,
          reviewerIds: input.reviewerIds ?? [],
          approverIds: input.approverIds ?? [],
          status: "draft",
          impact: input.impact,
          riskScore: input.impact === "high" ? 72 : input.impact === "medium" ? 48 : 24,
          relatedPolicyIds: input.relatedPolicyIds ?? [],
          outcome: "pending",
          tags: [],
          dueDate: input.dueDate,
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ decisions: [dec, ...s.decisions], audit: [audit(s, "decision_created", "decision", `Created decision '${input.title}'`, { objectId: id, objectLabel: input.title }), ...s.audit] }));
        return id;
      },

      updateDecision: (id, patch) =>
        set((s) => ({ decisions: s.decisions.map((d) => (d.id === id ? { ...d, ...patch, updatedAt: now() } : d)), audit: [audit(s, "decision_updated", "decision", `Updated decision`, { objectId: id, objectLabel: s.decisions.find((d) => d.id === id)?.title }), ...s.audit] })),

      transitionDecision: (id, to) =>
        set((s) => {
          const d = s.decisions.find((x) => x.id === id);
          if (!d) return {};
          return {
            decisions: s.decisions.map((x) => (x.id === id ? { ...x, status: to, outcome: to === "approved" ? "adopted" : to === "rejected" ? "rejected" : x.outcome, updatedAt: now() } : x)),
            audit: [audit(s, "decision_transition", "decision", `Workflow: ${d.status} → ${to}`, { objectId: id, objectLabel: d.title, changes: [{ field: "status", from: d.status, to }] }), ...s.audit],
          };
        }),

      submitReview: (decisionId, verdict, comment) =>
        set((s) => {
          const u = currentUser(s);
          const d = s.decisions.find((x) => x.id === decisionId);
          const review: DecisionReview = { id: uid("rev"), decisionId, reviewerId: u.id, reviewerName: u.name, verdict, comment, createdAt: now() };
          return { decisionReviews: [review, ...s.decisionReviews], audit: [audit(s, "decision_review", "decision", `Review (${verdict.replace(/_/g, " ")})`, { objectId: decisionId, objectLabel: d?.title, reason: comment }), ...s.audit] };
        }),

      recordApproval: (decisionId, approved, note) =>
        set((s) => {
          const u = currentUser(s);
          const d = s.decisions.find((x) => x.id === decisionId);
          const apr: DecisionApproval = { id: uid("apr"), decisionId, approverId: u.id, approverName: u.name, approved, note, createdAt: now() };
          const approvalsForDecision = [apr, ...s.decisionApprovals].filter((a) => a.decisionId === decisionId && a.approved).length;
          const required = s.settings.requireTwoApprovals ? 2 : 1;
          const newStatus: DecisionStatus | undefined = !approved ? "rejected" : approvalsForDecision >= required ? "approved" : undefined;
          return {
            decisionApprovals: [apr, ...s.decisionApprovals],
            decisions: newStatus ? s.decisions.map((x) => (x.id === decisionId ? { ...x, status: newStatus, outcome: newStatus === "approved" ? "adopted" : "rejected", updatedAt: now() } : x)) : s.decisions,
            audit: [audit(s, approved ? "decision_approved" : "decision_rejected", "decision", approved ? `Approved decision` : `Rejected decision`, { objectId: decisionId, objectLabel: d?.title, reason: note }), ...s.audit],
          };
        }),

      escalateDecision: (id) =>
        set((s) => {
          const d = s.decisions.find((x) => x.id === id);
          if (!d) return {};
          return { decisions: s.decisions.map((x) => (x.id === id ? { ...x, impact: "high", updatedAt: now() } : x)), audit: [audit(s, "decision_escalated", "decision", `Escalated decision`, { objectId: id, objectLabel: d.title }), ...s.audit] };
        }),

      setDecisionOutcome: (id, outcome, note) =>
        set((s) => ({ decisions: s.decisions.map((d) => (d.id === id ? { ...d, outcome, outcomeNote: note, updatedAt: now() } : d)), audit: [audit(s, "decision_updated", "decision", `Recorded outcome: ${outcome}`, { objectId: id, objectLabel: s.decisions.find((d) => d.id === id)?.title, reason: note }), ...s.audit] })),

      createRisk: (input) => {
        const id = uid("risk");
        const u = currentUser(get());
        const owner = input.ownerId ? get().users.find((x) => x.id === input.ownerId) : u;
        const r: GovernanceRisk = { id, title: input.title, description: input.description, category: input.category, severity: input.severity, likelihood: input.likelihood, score: scoreRisk(input.severity, input.likelihood), status: "open", ownerId: owner?.id ?? u.id, ownerName: owner?.name ?? u.name, mitigationPlan: input.mitigationPlan ?? "", relatedPolicyIds: input.relatedPolicyIds ?? [], history: [{ at: now(), note: "Risk registered", actorName: u.name }], createdAt: now(), updatedAt: now() };
        set((s) => ({ risks: [r, ...s.risks], audit: [audit(s, "risk_created", "risk", `Registered risk '${input.title}'`, { objectId: id, objectLabel: input.title }), ...s.audit] }));
        return id;
      },

      updateRisk: (id, patch) =>
        set((s) => ({
          risks: s.risks.map((r) => {
            if (r.id !== id) return r;
            const severity = patch.severity ?? r.severity;
            const likelihood = patch.likelihood ?? r.likelihood;
            return { ...r, ...patch, score: scoreRisk(severity, likelihood), updatedAt: now() };
          }),
          audit: [audit(s, "risk_updated", "risk", `Updated risk`, { objectId: id, objectLabel: s.risks.find((r) => r.id === id)?.title }), ...s.audit],
        })),

      setRiskStatus: (id, status, note) =>
        set((s) => {
          const u = currentUser(s);
          const r = s.risks.find((x) => x.id === id);
          if (!r) return {};
          return {
            risks: s.risks.map((x) => (x.id === id ? { ...x, status, history: [{ at: now(), note: note || `Status → ${status}`, actorName: u.name }, ...x.history], updatedAt: now() } : x)),
            audit: [audit(s, status === "resolved" ? "risk_resolved" : "risk_updated", "risk", `Risk status → ${status}`, { objectId: id, objectLabel: r.title, reason: note }), ...s.audit],
          };
        }),

      assignMitigation: (id, plan) =>
        set((s) => {
          const u = currentUser(s);
          const r = s.risks.find((x) => x.id === id);
          if (!r) return {};
          return {
            risks: s.risks.map((x) => (x.id === id ? { ...x, mitigationPlan: plan, status: x.status === "open" ? "mitigating" : x.status, history: [{ at: now(), note: "Mitigation assigned", actorName: u.name }, ...x.history], updatedAt: now() } : x)),
            audit: [audit(s, "risk_mitigation_assigned", "risk", `Assigned mitigation`, { objectId: id, objectLabel: r.title }), ...s.audit],
          };
        }),

      createControl: (input) =>
        set((s) => {
          const u = currentUser(s);
          const control: GovernanceControl = { id: uid("ctrl"), name: input.name, description: input.description, type: input.type, ownerId: u.id, ownerName: u.name, policyIds: input.policyIds };
          return { controls: [control, ...s.controls], audit: [audit(s, "control_updated", "control", `Created control '${input.name}'`, { objectId: control.id, objectLabel: input.name }), ...s.audit] };
        }),

      createCheck: (input) =>
        set((s) => {
          const u = currentUser(s);
          const check: ComplianceCheck = { id: uid("chk"), title: input.title, controlId: input.controlId, policyId: input.policyId, status: "not_assessed", evidence: input.evidence, ownerId: u.id, ownerName: u.name, lastCheckedAt: now() };
          return { checks: [check, ...s.checks], audit: [audit(s, "compliance_check_run", "check", `Created check '${input.title}'`, { objectId: check.id, objectLabel: input.title }), ...s.audit] };
        }),

      runCheck: (id, status, evidence) =>
        set((s) => {
          const c = s.checks.find((x) => x.id === id);
          if (!c) return {};
          return {
            checks: s.checks.map((x) => (x.id === id ? { ...x, status, evidence: evidence || x.evidence, lastCheckedAt: now() } : x)),
            audit: [audit(s, "compliance_check_run", "check", `Check '${c.title}' → ${status}`, { objectId: id, objectLabel: c.title }), ...s.audit],
          };
        }),

      requestException: (input) => {
        const id = uid("exc");
        const u = currentUser(get());
        const policy = get().policies.find((p) => p.id === input.policyId);
        const exc: ExceptionRequest = { id, title: input.title, policyId: input.policyId, policyTitle: policy?.title ?? "Policy", reason: input.reason, requestedById: u.id, requestedByName: u.name, status: "requested", expiresAt: daysFromNow(input.days ?? get().settings.exceptionDefaultDays), createdAt: now(), updatedAt: now() };
        set((s) => ({ exceptions: [exc, ...s.exceptions], audit: [audit(s, "exception_requested", "exception", `Requested exception '${input.title}'`, { objectId: id, objectLabel: input.title, reason: input.reason }), ...s.audit] }));
        return id;
      },

      transitionException: (id, to) =>
        set((s) => {
          const e = s.exceptions.find((x) => x.id === id);
          if (!e) return {};
          const action: AuditAction = to === "expired" ? "exception_expired" : to === "rejected" ? "exception_rejected" : to === "approved" ? "exception_approved" : "exception_review";
          return { exceptions: s.exceptions.map((x) => (x.id === id ? { ...x, status: to, updatedAt: now() } : x)), audit: [audit(s, action, "exception", `Exception: ${e.status} → ${to}`, { objectId: id, objectLabel: e.title }), ...s.audit] };
        }),

      recordExceptionApproval: (exceptionId, approved, note) =>
        set((s) => {
          const u = currentUser(s);
          const e = s.exceptions.find((x) => x.id === exceptionId);
          const apr: ExceptionApproval = { id: uid("exa"), exceptionId, approverId: u.id, approverName: u.name, approved, note, createdAt: now() };
          return {
            exceptionApprovals: [apr, ...s.exceptionApprovals],
            exceptions: s.exceptions.map((x) => (x.id === exceptionId ? { ...x, status: approved ? "approved" : "rejected", updatedAt: now() } : x)),
            audit: [audit(s, approved ? "exception_approved" : "exception_rejected", "exception", approved ? `Approved exception` : `Rejected exception`, { objectId: exceptionId, objectLabel: e?.title, reason: note }), ...s.audit],
          };
        }),

      acceptRecommendation: (id) =>
        set((s) => ({ acceptedRecommendationIds: [...s.acceptedRecommendationIds, id], audit: [audit(s, "recommendation_accepted", "settings", `Accepted recommendation`, {}), ...s.audit] })),

      generateReport: (kind) => {
        const id = uid("rep");
        const s = get();
        const u = currentUser(s);
        const built = buildReport(kind, { policies: s.policies, decisions: s.decisions, risks: s.risks, checks: s.checks, controls: s.controls, audit: s.audit });
        const report: GovernanceReport = { id, generatedById: u.id, generatedByName: u.name, generatedAt: now(), ...built };
        set((st) => ({ reports: [report, ...st.reports], audit: [audit(st, "report_generated", "report", `Generated ${kind} report`, { objectId: id, objectLabel: report.title }), ...st.audit] }));
        return id;
      },

      deleteReport: (id) => set((s) => ({ reports: s.reports.filter((r) => r.id !== id) })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch }, audit: [audit(s, "settings_updated", "settings", `Updated governance settings`, {}), ...s.audit] })),

      resetToSeed: () =>
        set({
          policies: SEED_POLICIES,
          policyVersions: SEED_POLICY_VERSIONS,
          decisions: SEED_DECISIONS,
          decisionReviews: SEED_REVIEWS,
          decisionApprovals: SEED_APPROVALS,
          risks: SEED_RISKS,
          controls: SEED_CONTROLS,
          checks: SEED_CHECKS,
          exceptions: SEED_EXCEPTIONS,
          exceptionApprovals: SEED_EXCEPTION_APPROVALS,
          acceptedRecommendationIds: [],
          reports: [],
          audit: SEED_AUDIT,
        }),
    }),
    { name: "vendorhub-governance-os", version: 1 },
  ),
);

export { generateRecommendations };
