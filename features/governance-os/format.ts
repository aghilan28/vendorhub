import type {
  AuditAction,
  CheckStatus,
  DecisionStatus,
  ExceptionStatus,
  PolicyStatus,
  ReviewVerdict,
  Severity,
} from "@/lib/governance-os";

export type BadgeVariant = "default" | "secondary" | "warning" | "danger" | "ai";

export const POLICY_STATUS_META: Record<PolicyStatus, { label: string; variant: BadgeVariant }> = {
  draft: { label: "Draft", variant: "secondary" },
  review: { label: "In review", variant: "warning" },
  approved: { label: "Approved", variant: "ai" },
  published: { label: "Published", variant: "default" },
  archived: { label: "Archived", variant: "secondary" },
};

export const DECISION_STATUS_META: Record<DecisionStatus, { label: string; variant: BadgeVariant }> = {
  draft: { label: "Draft", variant: "secondary" },
  review: { label: "In review", variant: "warning" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "danger" },
  exception: { label: "Exception", variant: "ai" },
  archived: { label: "Archived", variant: "secondary" },
};

export const EXCEPTION_STATUS_META: Record<ExceptionStatus, { label: string; variant: BadgeVariant }> = {
  requested: { label: "Requested", variant: "secondary" },
  review: { label: "In review", variant: "warning" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "danger" },
  expired: { label: "Expired", variant: "warning" },
  archived: { label: "Archived", variant: "secondary" },
};

export function severityVariant(s: Severity): BadgeVariant {
  return s === "low" ? "default" : s === "medium" ? "warning" : "danger";
}

export function riskScoreVariant(score: number): BadgeVariant {
  return score >= 55 ? "danger" : score >= 30 ? "warning" : "default";
}

export function checkVariant(s: CheckStatus): BadgeVariant {
  return s === "pass" ? "default" : s === "warning" ? "warning" : s === "fail" ? "danger" : "secondary";
}

export function verdictVariant(v: ReviewVerdict): BadgeVariant {
  return v === "approve" ? "default" : v === "reject" ? "danger" : v === "request_changes" ? "warning" : "secondary";
}

export function priorityVariant(p: "low" | "medium" | "high"): BadgeVariant {
  return p === "high" ? "danger" : p === "medium" ? "warning" : "secondary";
}

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  policy_created: "Policy created",
  policy_updated: "Policy updated",
  policy_versioned: "Policy versioned",
  policy_transition: "Policy transition",
  policy_archived: "Policy archived",
  decision_created: "Decision created",
  decision_updated: "Decision updated",
  decision_review: "Decision reviewed",
  decision_approved: "Decision approved",
  decision_rejected: "Decision rejected",
  decision_escalated: "Decision escalated",
  decision_transition: "Decision transition",
  risk_created: "Risk registered",
  risk_updated: "Risk updated",
  risk_mitigation_assigned: "Mitigation assigned",
  risk_resolved: "Risk resolved",
  control_updated: "Control updated",
  compliance_check_run: "Compliance check",
  exception_requested: "Exception requested",
  exception_review: "Exception reviewed",
  exception_approved: "Exception approved",
  exception_rejected: "Exception rejected",
  exception_expired: "Exception expired",
  report_generated: "Report generated",
  recommendation_accepted: "Recommendation accepted",
  settings_updated: "Settings updated",
};

export function relativeTime(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(then).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  return Number.isNaN(t) ? "—" : new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string): string {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? "" : new Date(t).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
