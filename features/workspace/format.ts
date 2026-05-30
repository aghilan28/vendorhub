import {
  Lightbulb,
  Sparkles,
  AlertTriangle,
  ShieldAlert,
  Stamp,
  FileWarning,
  CheckSquare,
  type LucideIcon,
} from "lucide-react";
import type { InboxKind, NotificationKind, Priority, ProjectStatus, TaskStatus } from "@/lib/workspace";

export type BadgeVariant = "default" | "secondary" | "warning" | "danger" | "ai";

export function taskStatusVariant(s: TaskStatus): BadgeVariant {
  return s === "done" ? "default" : s === "blocked" ? "danger" : s === "in_progress" ? "ai" : "secondary";
}
export function projectStatusVariant(s: ProjectStatus): BadgeVariant {
  return s === "complete" ? "default" : s === "on_hold" ? "warning" : s === "archived" ? "secondary" : "ai";
}
export function priorityVariant(p: Priority): BadgeVariant {
  return p === "high" ? "danger" : p === "medium" ? "warning" : "secondary";
}

export const NOTIFICATION_META: Record<NotificationKind, { label: string; variant: BadgeVariant }> = {
  event: { label: "Event", variant: "secondary" },
  approval: { label: "Approval", variant: "default" },
  review: { label: "Review", variant: "warning" },
  failure: { label: "Failure", variant: "danger" },
  recommendation: { label: "Recommendation", variant: "ai" },
  insight: { label: "Insight", variant: "ai" },
};

export const INBOX_META: Record<InboxKind, { label: string; variant: BadgeVariant; icon: LucideIcon }> = {
  insight: { label: "Insight", variant: "ai", icon: Lightbulb },
  recommendation: { label: "Recommendation", variant: "ai", icon: Sparkles },
  warning: { label: "Warning", variant: "danger", icon: AlertTriangle },
  risk: { label: "Risk", variant: "warning", icon: ShieldAlert },
  approval: { label: "Approval", variant: "default", icon: Stamp },
  exception: { label: "Exception", variant: "warning", icon: FileWarning },
  task: { label: "Task", variant: "secondary", icon: CheckSquare },
};

export { relativeTime, formatDate, SYSTEM_META } from "@/lib/workspace";
