import {
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  Compass,
  type LucideIcon,
} from "lucide-react";
import type { InsightKind, RiskLevel, RunStatus, Tone, WorkflowState } from "@/lib/simulation";

type BadgeVariant = "default" | "secondary" | "warning" | "danger" | "ai";

export function toneToBadge(tone: Tone): BadgeVariant {
  switch (tone) {
    case "success":
      return "default";
    case "warning":
      return "warning";
    case "danger":
      return "danger";
    case "info":
      return "ai";
    default:
      return "secondary";
  }
}

export function riskVariant(level: RiskLevel): BadgeVariant {
  return level === "low" ? "default" : level === "medium" ? "warning" : "danger";
}

export function priorityVariant(priority: "low" | "medium" | "high"): BadgeVariant {
  return priority === "high" ? "danger" : priority === "medium" ? "warning" : "secondary";
}

export const WORKFLOW_META: Record<WorkflowState, { label: string; variant: BadgeVariant }> = {
  draft: { label: "Draft", variant: "secondary" },
  review: { label: "In review", variant: "warning" },
  approved: { label: "Approved", variant: "ai" },
  scheduled: { label: "Scheduled", variant: "ai" },
  running: { label: "Running", variant: "ai" },
  completed: { label: "Completed", variant: "default" },
  archived: { label: "Archived", variant: "secondary" },
};

export const RUN_STATUS_META: Record<RunStatus, { label: string; variant: BadgeVariant }> = {
  queued: { label: "Queued", variant: "secondary" },
  running: { label: "Running", variant: "ai" },
  paused: { label: "Paused", variant: "warning" },
  completed: { label: "Completed", variant: "default" },
  cancelled: { label: "Cancelled", variant: "secondary" },
  failed: { label: "Failed", variant: "danger" },
};

export const INSIGHT_META: Record<InsightKind, { label: string; variant: BadgeVariant; icon: LucideIcon }> = {
  insight: { label: "Insight", variant: "ai", icon: Lightbulb },
  opportunity: { label: "Opportunity", variant: "default", icon: TrendingUp },
  risk: { label: "Risk", variant: "warning", icon: ShieldAlert },
  warning: { label: "Warning", variant: "danger", icon: AlertTriangle },
  recommendation: { label: "Recommendation", variant: "ai", icon: Sparkles },
  decision_support: { label: "Decision support", variant: "secondary", icon: Compass },
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

export function formatDateTime(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function formatRuntime(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export function confidencePct(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}
