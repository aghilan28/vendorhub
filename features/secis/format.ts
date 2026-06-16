import {
  Factory,
  Warehouse,
  Store,
  Package,
  Tags,
  Truck,
  MapPin,
  Users,
  CreditCard,
  Megaphone,
  Boxes,
  IndianRupee,
  AlertTriangle,
  TrendingUp,
  Swords,
  Scale,
  Sparkles,
  PackageX,
  type LucideIcon,
} from "lucide-react";
import type { ChangeEventType, EntityKind, RiskLevel, RunStatus, WorkflowState } from "@/lib/secis";

type BadgeVariant = "default" | "secondary" | "warning" | "danger" | "ai";

export function riskVariant(level: RiskLevel): BadgeVariant {
  return level === "low" ? "default" : level === "medium" ? "warning" : "danger";
}

export function priorityVariant(p: "low" | "medium" | "high"): BadgeVariant {
  return p === "high" ? "danger" : p === "medium" ? "warning" : "secondary";
}

export const WORKFLOW_META: Record<WorkflowState, { label: string; variant: BadgeVariant }> = {
  draft: { label: "Draft", variant: "secondary" },
  review: { label: "In review", variant: "warning" },
  approved: { label: "Approved", variant: "ai" },
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
};

export const ENTITY_KIND_META: Record<EntityKind, { label: string; icon: LucideIcon }> = {
  supplier: { label: "Supplier", icon: Factory },
  warehouse: { label: "Warehouse", icon: Warehouse },
  inventory_node: { label: "Inventory node", icon: Boxes },
  dark_store: { label: "Dark store", icon: Store },
  store: { label: "Store", icon: Store },
  product: { label: "Product", icon: Package },
  category: { label: "Category", icon: Tags },
  courier: { label: "Courier", icon: Truck },
  delivery_zone: { label: "Delivery zone", icon: MapPin },
  customer_segment: { label: "Customer segment", icon: Users },
  payment_gateway: { label: "Payment gateway", icon: CreditCard },
  pricing_engine: { label: "Pricing engine", icon: IndianRupee },
  marketing_channel: { label: "Marketing channel", icon: Megaphone },
};

export const EVENT_TYPE_ICON: Record<ChangeEventType, LucideIcon> = {
  supplier_failure: PackageX,
  demand_surge: TrendingUp,
  inventory_shock: Boxes,
  price_change: IndianRupee,
  delivery_failure: Truck,
  store_closure: Store,
  competitor_entry: Swords,
  policy_change: Scale,
  custom: Sparkles,
};

export const RISK_INFO_ICON = AlertTriangle;

// Severity → hex colour for the propagation graph.
export function severityColor(severity: number): string {
  if (severity >= 0.66) return "#dc2626"; // red
  if (severity >= 0.4) return "#f59e0b"; // amber
  if (severity >= 0.18) return "#eab308"; // yellow
  return "#10b981"; // green
}

export function severityVariant(severity: number): BadgeVariant {
  if (severity >= 0.66) return "danger";
  if (severity >= 0.4) return "warning";
  return "default";
}

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
