/**
 * MCP-1E Phase 4 — Seller Operations Center
 * Seller health scoring, violations, warnings, risk assessment, and performance monitoring
 */

import { createHash } from "crypto";
import type { HealthScore, SellerAction, SellerHealthStatus, SellerOperationsProfile, SellerOperationsSnapshot, SellerViolation, ViolationSeverity, ViolationType } from "./types";

function generateId(seed: string): string {
  return createHash("sha256").update(seed).digest("hex").slice(0, 16);
}

// ─── Seller Health Scoring ─────────────────────────────────────────────────────

export function computeSellerHealth(input: {
  totalOrders: number;
  fulfillmentRate: number;
  lateShipmentRate: number;
  returnRate: number;
  disputeRate: number;
  customerRating: number;
  activeViolations: number;
  warningCount: number;
}): { score: HealthScore; status: SellerHealthStatus; riskFactors: string[] } {
  let score = 80; // baseline
  const riskFactors: string[] = [];

  // Positive signals
  if (input.fulfillmentRate > 0.98) score += 10;
  else if (input.fulfillmentRate > 0.95) score += 5;
  if (input.customerRating > 4.5) score += 5;
  if (input.totalOrders > 100 && input.disputeRate < 0.01) score += 5;

  // Negative signals
  if (input.fulfillmentRate < 0.9) { score -= 20; riskFactors.push("Low fulfillment rate"); }
  else if (input.fulfillmentRate < 0.95) { score -= 10; riskFactors.push("Below-target fulfillment"); }

  if (input.lateShipmentRate > 0.2) { score -= 20; riskFactors.push("High late shipment rate"); }
  else if (input.lateShipmentRate > 0.1) { score -= 10; riskFactors.push("Elevated late shipments"); }

  if (input.returnRate > 0.15) { score -= 15; riskFactors.push("High return rate"); }
  else if (input.returnRate > 0.08) { score -= 5; riskFactors.push("Above-average returns"); }

  if (input.disputeRate > 0.05) { score -= 20; riskFactors.push("High dispute rate"); }
  else if (input.disputeRate > 0.02) { score -= 10; riskFactors.push("Elevated disputes"); }

  if (input.customerRating < 3.5) { score -= 15; riskFactors.push("Low customer rating"); }
  else if (input.customerRating < 4.0) { score -= 5; riskFactors.push("Below-average rating"); }

  if (input.activeViolations > 2) { score -= 20; riskFactors.push("Multiple active violations"); }
  else if (input.activeViolations > 0) { score -= 10; riskFactors.push("Active violation"); }

  if (input.warningCount > 3) { score -= 15; riskFactors.push("Multiple warnings"); }

  score = Math.max(0, Math.min(100, score));

  let status: SellerHealthStatus;
  if (score >= 85) status = "excellent";
  else if (score >= 70) status = "good";
  else if (score >= 50) status = "watch";
  else if (score >= 30) status = "probation";
  else status = "suspended";

  return { score, status, riskFactors };
}

// ─── Violation Management ──────────────────────────────────────────────────────

export function createViolation(input: {
  sellerId: string;
  type: ViolationType;
  severity: ViolationSeverity;
  description: string;
  evidence: string[];
  reportedBy: string;
}): SellerViolation {
  const now = new Date().toISOString();
  return {
    id: generateId(`violation-${input.sellerId}-${now}`),
    sellerId: input.sellerId,
    type: input.type,
    severity: input.severity,
    description: input.description,
    evidence: input.evidence,
    status: "reported",
    action: null,
    reportedBy: input.reportedBy,
    createdAt: now,
    resolvedAt: null,
  };
}

export function confirmViolation(violation: SellerViolation): SellerViolation {
  return { ...violation, status: "confirmed" };
}

export function dismissViolation(violation: SellerViolation): SellerViolation {
  return { ...violation, status: "dismissed", resolvedAt: new Date().toISOString() };
}

export function applyAction(violation: SellerViolation, action: Omit<SellerAction, "appliedAt">): SellerViolation {
  return {
    ...violation,
    status: "actioned",
    action: { ...action, appliedAt: new Date().toISOString() },
    resolvedAt: new Date().toISOString(),
  };
}

// ─── Recommended Action ────────────────────────────────────────────────────────

export function recommendAction(violation: SellerViolation): SellerAction["type"] {
  const severityMap: Record<ViolationSeverity, SellerAction["type"]> = {
    warning: "warning",
    minor: "warning",
    major: "listing_removal",
    critical: "temporary_suspension",
  };
  if (violation.type === "fraud" || violation.type === "customer_harassment") return "permanent_ban";
  if (violation.type === "fake_product" && violation.severity === "critical") return "permanent_ban";
  return severityMap[violation.severity];
}

// ─── Seller Operations Snapshot ────────────────────────────────────────────────

export function computeSellerOperationsSnapshot(sellers: SellerOperationsProfile[], violations: SellerViolation[]): SellerOperationsSnapshot {
  const totalSellers = sellers.length;
  const riskDistribution: Record<SellerHealthStatus, number> = { excellent: 0, good: 0, watch: 0, probation: 0, suspended: 0 };
  let totalFulfillment = 0;
  let totalRating = 0;

  for (const s of sellers) {
    riskDistribution[s.healthStatus]++;
    totalFulfillment += s.fulfillmentRate;
    totalRating += s.customerRating;
  }

  const openViolations = violations.filter((v) => v.status === "reported" || v.status === "investigating" || v.status === "confirmed").length;
  const pendingInvestigations = violations.filter((v) => v.status === "investigating").length;

  const violationTypeCounts = new Map<ViolationType, number>();
  for (const v of violations) {
    violationTypeCounts.set(v.type, (violationTypeCounts.get(v.type) ?? 0) + 1);
  }
  const topViolationTypes = [...violationTypeCounts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalSellers,
    excellentSellers: riskDistribution.excellent,
    watchSellers: riskDistribution.watch,
    probationSellers: riskDistribution.probation,
    suspendedSellers: riskDistribution.suspended,
    openViolations,
    pendingInvestigations,
    avgFulfillmentRate: totalSellers > 0 ? Number((totalFulfillment / totalSellers).toFixed(3)) : 0,
    avgCustomerRating: totalSellers > 0 ? Number((totalRating / totalSellers).toFixed(2)) : 0,
    topViolationTypes,
    riskDistribution,
  };
}
