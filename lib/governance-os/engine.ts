// KARTEX M5 — Governance engine. Pure, deterministic governance computations:
// risk scoring, compliance scoring, decision governance-readiness / policy
// evaluation, recommendation generation, and report building.

import type {
  AuditRecord,
  ComplianceCheck,
  Decision,
  DecisionApproval,
  ExceptionRequest,
  GovernanceControl,
  GovernanceRecommendation,
  GovernanceReport,
  GovernanceRisk,
  Likelihood,
  Policy,
  ReportKind,
  Severity,
} from "./types";

// ── Formatters ───────────────────────────────────────────────────────────────

export function round(value: number, digits = 0) {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
export function formatPercent(value: number) {
  return `${round(value)}%`;
}
export function formatDate(iso: string) {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? "" : new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── Risk scoring ─────────────────────────────────────────────────────────────

const SEVERITY_WEIGHT: Record<Severity, number> = { low: 0.25, medium: 0.5, high: 0.75, critical: 1 };
const LIKELIHOOD_WEIGHT: Record<Likelihood, number> = { rare: 0.1, unlikely: 0.3, possible: 0.5, likely: 0.75, almost_certain: 0.95 };

export function scoreRisk(severity: Severity, likelihood: Likelihood): number {
  return round((SEVERITY_WEIGHT[severity] * 0.6 + LIKELIHOOD_WEIGHT[likelihood] * 0.4) * 100);
}

export function riskLevel(score: number): Severity {
  return score >= 78 ? "critical" : score >= 55 ? "high" : score >= 30 ? "medium" : "low";
}

// ── Compliance ───────────────────────────────────────────────────────────────

export interface ComplianceSummary {
  score: number; // 0..100
  coverage: number; // % assessed
  counts: { pass: number; fail: number; warning: number; not_assessed: number };
  total: number;
}

export function computeCompliance(checks: ComplianceCheck[]): ComplianceSummary {
  const counts = { pass: 0, fail: 0, warning: 0, not_assessed: 0 };
  for (const c of checks) counts[c.status] += 1;
  const total = checks.length || 1;
  const assessed = counts.pass + counts.fail + counts.warning;
  const points = counts.pass * 1 + counts.warning * 0.5;
  const score = assessed ? round((points / assessed) * 100) : 0;
  return { score, coverage: round((assessed / total) * 100), counts, total: checks.length };
}

export function controlCoverage(policies: Policy[]): number {
  const live = policies.filter((p) => p.status !== "archived");
  if (live.length === 0) return 0;
  const covered = live.filter((p) => p.controlIds.length > 0).length;
  return round((covered / live.length) * 100);
}

// ── Decision governance-readiness / policy evaluation ────────────────────────

export interface DecisionEvaluation {
  applicablePolicies: Policy[];
  mandatoryRuleCount: number;
  approvalsCount: number;
  requiredApprovals: number;
  checks: Array<{ label: string; passed: boolean }>;
  readinessScore: number; // 0..100
  readyToApprove: boolean;
  gaps: string[];
}

export function evaluateDecision(
  decision: Decision,
  policies: Policy[],
  approvals: DecisionApproval[],
  requiredApprovals = 1,
): DecisionEvaluation {
  const published = policies.filter((p) => p.status === "published");
  const applicable = published.filter((p) => p.appliesToSystems.includes(decision.sourceSystem) || decision.relatedPolicyIds.includes(p.id));
  const mandatoryRuleCount = applicable.reduce((sum, p) => sum + p.rules.filter((r) => r.type === "mandatory").length, 0);
  const approvalsCount = approvals.filter((a) => a.decisionId === decision.id && a.approved).length;

  const checks = [
    { label: "Owner assigned", passed: Boolean(decision.ownerId) },
    { label: "Accountable party assigned", passed: Boolean(decision.accountableId) },
    { label: "Reviewer assigned", passed: decision.reviewerIds.length > 0 },
    { label: "Linked to applicable policy", passed: applicable.length === 0 || decision.relatedPolicyIds.some((id) => applicable.some((p) => p.id === id)) },
    { label: `Required approvals met (${approvalsCount}/${requiredApprovals})`, passed: approvalsCount >= requiredApprovals },
  ];
  const passed = checks.filter((c) => c.passed).length;
  const readinessScore = round((passed / checks.length) * 100);
  const gaps = checks.filter((c) => !c.passed).map((c) => c.label);

  return {
    applicablePolicies: applicable,
    mandatoryRuleCount,
    approvalsCount,
    requiredApprovals,
    checks,
    readinessScore,
    readyToApprove: gaps.length === 0,
    gaps,
  };
}

// ── Recommendation generation ────────────────────────────────────────────────

export interface RecommendationInput {
  policies: Policy[];
  decisions: Decision[];
  risks: GovernanceRisk[];
  checks: ComplianceCheck[];
  exceptions: ExceptionRequest[];
}

let recSeq = 0;
function recId() {
  recSeq += 1;
  return `rec-${recSeq}`;
}

export function generateRecommendations(input: RecommendationInput, now = Date.now()): GovernanceRecommendation[] {
  const recs: GovernanceRecommendation[] = [];

  for (const p of input.policies.filter((x) => x.status !== "archived")) {
    if (p.approverIds.length === 0) recs.push({ id: recId(), kind: "ownership", title: `Assign an approver to "${p.title}"`, detail: "Policy has no approver, so it cannot be formally approved.", priority: "high", objectType: "policy", objectId: p.id });
    if (p.controlIds.length === 0) recs.push({ id: recId(), kind: "compliance", title: `Add a control to "${p.title}"`, detail: "Policy has no linked control, leaving compliance unmeasured.", priority: "medium", objectType: "policy", objectId: p.id });
  }

  for (const d of input.decisions.filter((x) => x.status === "review")) {
    if (d.reviewerIds.length === 0) recs.push({ id: recId(), kind: "gap", title: `"${d.title}" has no reviewer`, detail: "A decision in review needs at least one reviewer.", priority: "high", objectType: "decision", objectId: d.id });
    if (d.dueDate && Date.parse(d.dueDate) < now) recs.push({ id: recId(), kind: "overdue", title: `"${d.title}" is overdue`, detail: "This decision is past its due date and still awaiting approval.", priority: "high", objectType: "decision", objectId: d.id });
  }

  for (const r of input.risks.filter((x) => x.status === "open")) {
    if ((r.severity === "high" || r.severity === "critical") && !r.mitigationPlan.trim()) {
      recs.push({ id: recId(), kind: "risk", title: `Mitigate "${r.title}"`, detail: `A ${r.severity} risk has no mitigation plan.`, priority: "high", objectType: "risk", objectId: r.id });
    }
  }

  if (input.checks.some((c) => c.status === "fail")) {
    const fails = input.checks.filter((c) => c.status === "fail").length;
    recs.push({ id: recId(), kind: "compliance", title: `${fails} compliance check(s) failing`, detail: "Failing controls require remediation to restore compliance.", priority: "high", objectType: "check" });
  }

  for (const e of input.exceptions) {
    if (e.status === "approved" && e.expiresAt && Date.parse(e.expiresAt) < now) {
      recs.push({ id: recId(), kind: "overdue", title: `Exception "${e.title}" has expired`, detail: "An approved exception is past its expiry and should be reviewed or archived.", priority: "medium", objectType: "exception", objectId: e.id });
    }
  }

  return recs;
}

// ── Report building ──────────────────────────────────────────────────────────

export interface ReportData {
  policies: Policy[];
  decisions: Decision[];
  risks: GovernanceRisk[];
  checks: ComplianceCheck[];
  controls: GovernanceControl[];
  audit: AuditRecord[];
}

export function buildReport(kind: ReportKind, data: ReportData): Omit<GovernanceReport, "id" | "generatedById" | "generatedByName" | "generatedAt"> {
  switch (kind) {
    case "policy": {
      const live = data.policies.filter((p) => p.status !== "archived");
      return {
        kind,
        title: "Policy report",
        summary: `${live.length} active policies; ${data.policies.filter((p) => p.status === "published").length} published.`,
        metrics: [
          { label: "Total policies", value: String(data.policies.length) },
          { label: "Published", value: String(data.policies.filter((p) => p.status === "published").length) },
          { label: "In review", value: String(data.policies.filter((p) => p.status === "review").length) },
          { label: "Control coverage", value: formatPercent(controlCoverage(data.policies)) },
        ],
        sections: [
          {
            heading: "Policies",
            columns: ["Title", "Category", "Status", "Version", "Owner", "Rules"],
            rows: data.policies.map((p) => [p.title, p.category, p.status, `v${p.version}`, p.ownerName, String(p.rules.length)]),
          },
        ],
      };
    }
    case "decision": {
      return {
        kind,
        title: "Decision report",
        summary: `${data.decisions.length} decisions; ${data.decisions.filter((d) => d.status === "approved").length} approved, ${data.decisions.filter((d) => d.status === "rejected").length} rejected.`,
        metrics: [
          { label: "Total", value: String(data.decisions.length) },
          { label: "Approved", value: String(data.decisions.filter((d) => d.status === "approved").length) },
          { label: "Rejected", value: String(data.decisions.filter((d) => d.status === "rejected").length) },
          { label: "Pending review", value: String(data.decisions.filter((d) => d.status === "review").length) },
        ],
        sections: [
          {
            heading: "Decisions",
            columns: ["Title", "Type", "Source", "Status", "Owner", "Impact"],
            rows: data.decisions.map((d) => [d.title, d.type, d.sourceSystem, d.status, d.ownerName, d.impact]),
          },
        ],
      };
    }
    case "risk": {
      const open = data.risks.filter((r) => r.status === "open" || r.status === "mitigating");
      return {
        kind,
        title: "Risk report",
        summary: `${open.length} open/mitigating risks; ${data.risks.filter((r) => r.severity === "critical").length} critical.`,
        metrics: [
          { label: "Total risks", value: String(data.risks.length) },
          { label: "Open", value: String(data.risks.filter((r) => r.status === "open").length) },
          { label: "Critical", value: String(data.risks.filter((r) => r.severity === "critical").length) },
          { label: "Resolved", value: String(data.risks.filter((r) => r.status === "resolved").length) },
        ],
        sections: [
          {
            heading: "Risk registry",
            columns: ["Title", "Category", "Severity", "Likelihood", "Score", "Status", "Owner"],
            rows: data.risks.map((r) => [r.title, r.category, r.severity, r.likelihood, String(r.score), r.status, r.ownerName]),
          },
        ],
      };
    }
    case "compliance": {
      const c = computeCompliance(data.checks);
      return {
        kind,
        title: "Compliance report",
        summary: `Compliance score ${c.score}% with ${c.coverage}% coverage across ${c.total} checks.`,
        metrics: [
          { label: "Compliance score", value: formatPercent(c.score) },
          { label: "Coverage", value: formatPercent(c.coverage) },
          { label: "Failing", value: String(c.counts.fail) },
          { label: "Controls", value: String(data.controls.length) },
        ],
        sections: [
          {
            heading: "Compliance checks",
            columns: ["Check", "Status", "Owner", "Last checked"],
            rows: data.checks.map((ck) => [ck.title, ck.status, ck.ownerName, formatDate(ck.lastCheckedAt)]),
          },
        ],
      };
    }
    case "audit":
    default: {
      return {
        kind: "audit",
        title: "Audit report",
        summary: `${data.audit.length} audited governance actions.`,
        metrics: [{ label: "Audit events", value: String(data.audit.length) }],
        sections: [
          {
            heading: "Audit trail",
            columns: ["When", "Actor", "Action", "Object", "Summary"],
            rows: data.audit.slice(0, 200).map((a) => [formatDate(a.at), a.actorName, a.action, a.objectLabel ?? a.objectType, a.summary]),
          },
        ],
      };
    }
  }
}
