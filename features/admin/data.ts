import { AlertTriangle, BadgeIndianRupee, Boxes, ClipboardList, Flag, ShieldCheck, Store, Users } from "lucide-react";
import type {
  AdminNotification,
  AuditLogEntry,
  CategoryNode,
  GovernanceFlag,
  GovernanceMetric,
  ModerationCase,
  PlatformOrder,
  RefundCase,
  VendorApplication,
} from "./types";

export const governanceMetrics: GovernanceMetric[] = [
  { label: "Total GMV", value: "Rs 0", helper: "No real orders yet", tone: "neutral", icon: BadgeIndianRupee },
  { label: "Active sellers", value: "0", helper: "Awaiting verified onboarding", tone: "neutral", icon: Store },
  { label: "Pending approvals", value: "0", helper: "Verification queue is empty", tone: "neutral", icon: ShieldCheck },
  { label: "Total orders", value: "0", helper: "No platform orders yet", tone: "neutral", icon: ClipboardList },
  { label: "Flagged content", value: "0", helper: "No catalog content to moderate", tone: "neutral", icon: Flag },
  { label: "Refund requests", value: "0", helper: "No transactions yet", tone: "neutral", icon: AlertTriangle },
  { label: "Active buyers", value: "0", helper: "No live demand data yet", tone: "neutral", icon: Users },
  { label: "Operational health", value: "Ready", helper: "Infrastructure shell is available", tone: "success", icon: Boxes },
];

export const vendors: VendorApplication[] = [];

export const moderationCases: ModerationCase[] = [];

export const refunds: RefundCase[] = [];

export const platformOrders: PlatformOrder[] = [];

export const categories: CategoryNode[] = [];

export const flags: GovernanceFlag[] = [];

export const auditLogs: AuditLogEntry[] = [];

export const adminNotifications: AdminNotification[] = [];
