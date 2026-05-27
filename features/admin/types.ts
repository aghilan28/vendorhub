import type { LucideIcon } from "lucide-react";

export type GovernanceTone = "success" | "warning" | "danger" | "neutral" | "info";
export type ModerationStatus = "pending_review" | "approved" | "rejected" | "flagged" | "suspended";
export type VendorStatus = "pending" | "approved" | "needs_review" | "suspended";
export type RefundStatus = "open" | "under_review" | "approved_placeholder" | "rejected_placeholder";
export type FlagType = "suspicious_seller" | "suspicious_review" | "suspicious_product" | "operational_anomaly";

export interface GovernanceMetric {
  label: string;
  value: string;
  helper: string;
  tone: GovernanceTone;
  icon: LucideIcon;
}

export interface VendorApplication {
  id: string;
  businessName: string;
  owner: string;
  category: string;
  zone: string;
  status: VendorStatus;
  risk: "low" | "medium" | "high";
  submittedAt: string;
  documents: string[];
  notes: string;
  orders30d: number;
  fulfillmentRate: number;
  ratingPlaceholder: string;
}

export interface ModerationCase {
  id: string;
  type: "product" | "review";
  title: string;
  seller: string;
  status: ModerationStatus;
  priority: "low" | "medium" | "high" | "critical";
  reason: string;
  reportedAt: string;
  history: string;
}

export interface RefundCase {
  id: string;
  orderId: string;
  customer: string;
  seller: string;
  amount: number;
  status: RefundStatus;
  reason: string;
  openedAt: string;
}

export interface PlatformOrder {
  id: string;
  seller: string;
  customer: string;
  status: "pending" | "confirmed" | "processing" | "packed" | "shipped" | "out_for_delivery" | "delivered" | "cancelled" | "refunded";
  value: number;
  zone: string;
  signal: string;
  paymentState?: string;
  transactionReference?: string;
}

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parent: string;
  status: "active" | "inactive";
  productCount: number;
  imagePlaceholder: string;
}

export interface GovernanceFlag {
  id: string;
  type: FlagType;
  severity: "low" | "medium" | "high" | "critical";
  subject: string;
  detail: string;
  createdAt: string;
  owner: string;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
  domain: "seller" | "moderation" | "category" | "refund" | "operations";
  note: string;
}

export interface AdminNotification {
  id: string;
  title: string;
  detail: string;
  type: "operations" | "moderation" | "seller" | "system" | "refund";
  time: string;
  read: boolean;
}
