/**
 * MCP-1E Phase 8 — Refund & Cancellation Governance
 * Approval workflows, risk controls, fraud detection, audit trails
 */

import { createHash } from "crypto";
import type { AuditEntry, CancellationRequest, CancellationStatus, RefundAnalytics, RefundGovernanceRules, RefundRequest, RefundRiskLevel, RefundStatus } from "./types";

function generateId(seed: string): string {
  return createHash("sha256").update(seed).digest("hex").slice(0, 16);
}

// ─── Default Governance Rules ──────────────────────────────────────────────────

export const DEFAULT_REFUND_RULES: RefundGovernanceRules = {
  autoApproveThreshold: 500, // INR — auto-approve refunds below this
  autoApproveMaxPerDay: 50,
  highRiskThreshold: 60,
  fraudBlockThreshold: 85,
  maxRefundPerCustomerPerMonth: 5,
  cooldownDays: 3,
};

// ─── Refund Risk Scoring ───────────────────────────────────────────────────────

export function computeRefundRisk(input: {
  amount: number;
  customerRefundCount30Days: number;
  customerLifetimeRefunds: number;
  customerLifetimeOrders: number;
  daysSinceOrder: number;
  category: RefundRequest["category"];
  isRepeatProduct: boolean;
}): { riskScore: number; riskLevel: RefundRiskLevel; riskFactors: string[] } {
  let score = 10; // baseline risk
  const factors: string[] = [];

  // Amount risk
  if (input.amount > 5000) { score += 15; factors.push("High value refund"); }
  else if (input.amount > 2000) { score += 8; factors.push("Above-average refund amount"); }

  // Frequency risk
  if (input.customerRefundCount30Days > 3) { score += 25; factors.push("Frequent refund requester"); }
  else if (input.customerRefundCount30Days > 1) { score += 10; factors.push("Multiple recent refunds"); }

  // Ratio risk
  const refundRatio = input.customerLifetimeRefunds / Math.max(input.customerLifetimeOrders, 1);
  if (refundRatio > 0.4) { score += 20; factors.push("High refund-to-order ratio"); }
  else if (refundRatio > 0.2) { score += 10; factors.push("Above-average refund ratio"); }

  // Timing risk
  if (input.daysSinceOrder > 30) { score += 15; factors.push("Late refund request"); }
  else if (input.daysSinceOrder > 14) { score += 5; factors.push("Delayed refund request"); }

  // Category risk
  if (input.category === "changed_mind") { score += 5; factors.push("Discretionary refund"); }
  if (input.category === "fraud") { score += 30; factors.push("Fraud-related claim"); }
  if (input.category === "duplicate") { score += 10; factors.push("Duplicate refund claim"); }

  // Pattern risk
  if (input.isRepeatProduct) { score += 15; factors.push("Repeated refund on same product"); }

  score = Math.min(100, score);

  let level: RefundRiskLevel;
  if (score >= 85) level = "fraud_suspected";
  else if (score >= 60) level = "high";
  else if (score >= 35) level = "medium";
  else level = "low";

  return { riskScore: score, riskLevel: level, riskFactors: factors };
}

// ─── Refund Request Creation ───────────────────────────────────────────────────

export function createRefundRequest(input: {
  orderId: string;
  customerId: string;
  sellerId: string;
  amount: number;
  reason: string;
  category: RefundRequest["category"];
  riskScore: number;
  riskLevel: RefundRiskLevel;
  riskFactors: string[];
  rules: RefundGovernanceRules;
}): RefundRequest {
  const now = new Date().toISOString();
  const id = generateId(`refund-${input.customerId}-${input.orderId}-${now}`);

  // Auto-approve logic
  const autoApproved = input.riskLevel === "low" && input.amount <= input.rules.autoApproveThreshold;

  const status: RefundStatus = input.riskLevel === "fraud_suspected"
    ? "rejected"
    : autoApproved
      ? "approved"
      : "under_review";

  const audit: AuditEntry[] = [{
    id: generateId(`audit-${id}-create`),
    timestamp: now,
    actor: input.customerId,
    actorRole: "customer",
    action: "refund_requested",
    detail: `Refund of ₹${input.amount} requested for order ${input.orderId}`,
  }];

  if (autoApproved) {
    audit.push({
      id: generateId(`audit-${id}-auto`),
      timestamp: now,
      actor: "system",
      actorRole: "admin",
      action: "auto_approved",
      detail: `Auto-approved: low risk (${input.riskScore}), amount ≤ ₹${input.rules.autoApproveThreshold}`,
    });
  }

  if (status === "rejected") {
    audit.push({
      id: generateId(`audit-${id}-block`),
      timestamp: now,
      actor: "system",
      actorRole: "admin",
      action: "auto_blocked",
      detail: `Auto-blocked: fraud suspected (risk score ${input.riskScore})`,
    });
  }

  return {
    id,
    orderId: input.orderId,
    customerId: input.customerId,
    sellerId: input.sellerId,
    amount: input.amount,
    currency: "INR",
    reason: input.reason,
    category: input.category,
    status,
    riskLevel: input.riskLevel,
    riskScore: input.riskScore,
    riskFactors: input.riskFactors,
    autoApproved,
    approvedBy: autoApproved ? "system" : null,
    approvedAt: autoApproved ? now : null,
    rejectionReason: status === "rejected" ? "Fraud suspected - manual review required" : null,
    audit,
    createdAt: now,
    completedAt: autoApproved ? now : null,
  };
}

// ─── Manual Approval/Rejection ─────────────────────────────────────────────────

export function approveRefund(request: RefundRequest, approvedBy: string): RefundRequest {
  const now = new Date().toISOString();
  return {
    ...request,
    status: "approved",
    approvedBy,
    approvedAt: now,
    audit: [...request.audit, { id: generateId(`audit-${request.id}-approve-${now}`), timestamp: now, actor: approvedBy, actorRole: "admin", action: "manually_approved", detail: `Refund approved by ${approvedBy}` }],
  };
}

export function rejectRefund(request: RefundRequest, rejectedBy: string, reason: string): RefundRequest {
  const now = new Date().toISOString();
  return {
    ...request,
    status: "rejected",
    rejectionReason: reason,
    audit: [...request.audit, { id: generateId(`audit-${request.id}-reject-${now}`), timestamp: now, actor: rejectedBy, actorRole: "admin", action: "rejected", detail: reason }],
  };
}

// ─── Cancellation Request ──────────────────────────────────────────────────────

export function createCancellationRequest(input: {
  orderId: string;
  requestedBy: string;
  requestedByRole: CancellationRequest["requestedByRole"];
  reason: string;
  category: CancellationRequest["category"];
}): CancellationRequest {
  const now = new Date().toISOString();
  const id = generateId(`cancel-${input.orderId}-${now}`);

  // Auto-approve customer cancellations if within policy
  const autoApprove = input.requestedByRole === "customer" && ["customer_request", "out_of_stock"].includes(input.category);
  const status: CancellationStatus = autoApprove ? "approved" : "requested";

  return {
    id,
    orderId: input.orderId,
    requestedBy: input.requestedBy,
    requestedByRole: input.requestedByRole,
    reason: input.reason,
    category: input.category,
    status,
    inventoryRestored: false,
    refundTriggered: false,
    relatedRefundId: null,
    approvedBy: autoApprove ? "system" : null,
    audit: [{
      id: generateId(`audit-${id}-create`),
      timestamp: now,
      actor: input.requestedBy,
      actorRole: input.requestedByRole,
      action: "cancellation_requested",
      detail: `Cancellation requested: ${input.reason}`,
    }],
    createdAt: now,
    completedAt: autoApprove ? now : null,
  };
}

export function approveCancellation(request: CancellationRequest, approvedBy: string): CancellationRequest {
  const now = new Date().toISOString();
  return {
    ...request,
    status: "approved",
    approvedBy,
    audit: [...request.audit, { id: generateId(`audit-${request.id}-approve`), timestamp: now, actor: approvedBy, actorRole: "admin", action: "approved", detail: "Cancellation approved" }],
    completedAt: now,
  };
}

// ─── Refund Analytics ──────────────────────────────────────────────────────────

export function computeRefundAnalytics(requests: RefundRequest[]): RefundAnalytics {
  const totalRefunds = requests.length;
  const approved = requests.filter((r) => r.status === "approved" || r.status === "completed").length;
  const rejected = requests.filter((r) => r.status === "rejected").length;
  const totalAmount = requests.filter((r) => r.status === "approved" || r.status === "completed").reduce((s, r) => s + r.amount, 0);
  const avgAmount = approved > 0 ? totalAmount / approved : 0;
  const autoApproved = requests.filter((r) => r.autoApproved).length;
  const autoApprovalRate = totalRefunds > 0 ? autoApproved / totalRefunds : 0;
  const fraudDetected = requests.filter((r) => r.riskLevel === "fraud_suspected").length;

  const completed = requests.filter((r) => r.completedAt);
  const avgProcessingHours = completed.length > 0
    ? completed.reduce((s, r) => s + (new Date(r.completedAt!).getTime() - new Date(r.createdAt).getTime()) / (60 * 60 * 1000), 0) / completed.length
    : 0;

  const refundsByCategory: Record<string, number> = {};
  const riskDistribution: Record<RefundRiskLevel, number> = { low: 0, medium: 0, high: 0, fraud_suspected: 0 };
  for (const r of requests) {
    refundsByCategory[r.category] = (refundsByCategory[r.category] ?? 0) + 1;
    riskDistribution[r.riskLevel]++;
  }

  return {
    totalRefunds,
    approvedRefunds: approved,
    rejectedRefunds: rejected,
    totalAmount,
    avgAmount: Math.round(avgAmount),
    autoApprovalRate: Number(autoApprovalRate.toFixed(3)),
    fraudDetectedCount: fraudDetected,
    avgProcessingHours: Number(avgProcessingHours.toFixed(1)),
    refundsByCategory,
    riskDistribution,
  };
}
