/**
 * MCP-1E Phase 3 — Customer Operations Center
 * Customer health, complaint management, issue tracking, and risk assessment
 */

import { createHash } from "crypto";
import type { CustomerHealthStatus, CustomerIssue, CustomerIssueType, CustomerOperationsSnapshot, CustomerProfile, HealthScore, Priority } from "./types";

function generateId(seed: string): string {
  return createHash("sha256").update(seed).digest("hex").slice(0, 16);
}

// ─── Customer Health Scoring ───────────────────────────────────────────────────

export function computeCustomerHealth(input: {
  lifetimeOrders: number;
  lifetimeSpend: number;
  openIssues: number;
  totalIssues: number;
  daysSinceLastOrder: number;
  satisfactionAvg: number;
  refundCount: number;
  disputeCount: number;
}): { score: HealthScore; status: CustomerHealthStatus; riskFactors: string[] } {
  let score = 70; // baseline
  const riskFactors: string[] = [];

  // Positive signals
  if (input.lifetimeOrders > 10) score += 10;
  else if (input.lifetimeOrders > 5) score += 5;
  if (input.satisfactionAvg > 4) score += 5;
  if (input.lifetimeSpend > 10000) score += 5;

  // Negative signals
  if (input.openIssues > 2) { score -= 15; riskFactors.push("Multiple open issues"); }
  else if (input.openIssues > 0) { score -= 5; riskFactors.push("Has open issues"); }

  if (input.daysSinceLastOrder > 90) { score -= 20; riskFactors.push("Inactive 90+ days"); }
  else if (input.daysSinceLastOrder > 60) { score -= 10; riskFactors.push("Inactive 60+ days"); }

  if (input.satisfactionAvg < 3) { score -= 15; riskFactors.push("Low satisfaction"); }
  if (input.refundCount > 3) { score -= 10; riskFactors.push("Frequent refunds"); }
  if (input.disputeCount > 1) { score -= 10; riskFactors.push("Multiple disputes"); }

  const issueRate = input.totalIssues / Math.max(input.lifetimeOrders, 1);
  if (issueRate > 0.3) { score -= 10; riskFactors.push("High issue rate"); }

  score = Math.max(0, Math.min(100, score));

  let status: CustomerHealthStatus;
  if (score >= 70) status = "healthy";
  else if (score >= 50) status = "at_risk";
  else if (score >= 30) status = "churning";
  else status = "lost";

  return { score, status, riskFactors };
}

// ─── Customer Issue Creation ───────────────────────────────────────────────────

export function createCustomerIssue(input: {
  customerId: string;
  type: CustomerIssueType;
  description: string;
  relatedOrderId?: string;
  relatedTicketId?: string;
}): CustomerIssue {
  const now = new Date().toISOString();
  const id = generateId(`issue-${input.customerId}-${now}`);
  const priorityMap: Record<CustomerIssueType, Priority> = {
    complaint: "high",
    refund_request: "high",
    cancellation_request: "medium",
    delivery_complaint: "high",
    service_complaint: "medium",
    escalation: "urgent",
  };

  return {
    id,
    customerId: input.customerId,
    type: input.type,
    description: input.description,
    priority: priorityMap[input.type],
    status: "open",
    relatedTicketId: input.relatedTicketId ?? null,
    relatedOrderId: input.relatedOrderId ?? null,
    resolution: null,
    createdAt: now,
    resolvedAt: null,
  };
}

// ─── Resolve Issue ─────────────────────────────────────────────────────────────

export function resolveCustomerIssue(issue: CustomerIssue, resolution: string): CustomerIssue {
  return { ...issue, status: "resolved", resolution, resolvedAt: new Date().toISOString() };
}

// ─── Customer Operations Snapshot ──────────────────────────────────────────────

export function computeCustomerOperationsSnapshot(customers: CustomerProfile[], issues: CustomerIssue[]): CustomerOperationsSnapshot {
  const totalCustomers = customers.length;
  const healthyCustomers = customers.filter((c) => c.healthStatus === "healthy").length;
  const atRiskCustomers = customers.filter((c) => c.healthStatus === "at_risk").length;
  const churningCustomers = customers.filter((c) => c.healthStatus === "churning").length;

  const openIssues = issues.filter((i) => i.status === "open" || i.status === "investigating");
  const openComplaints = openIssues.filter((i) => i.type === "complaint" || i.type === "delivery_complaint" || i.type === "service_complaint").length;
  const pendingRefunds = openIssues.filter((i) => i.type === "refund_request").length;
  const pendingCancellations = openIssues.filter((i) => i.type === "cancellation_request").length;

  const satisfactionScores = customers.filter((c) => c.satisfactionAvg > 0).map((c) => c.satisfactionAvg);
  const avgSatisfaction = satisfactionScores.length > 0 ? satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length : 0;

  const issuesByType = {} as Record<CustomerIssueType, number>;
  for (const i of issues) {
    issuesByType[i.type] = (issuesByType[i.type] ?? 0) + 1;
  }

  // Top risk factors across all customers
  const factorCounts = new Map<string, number>();
  for (const c of customers) {
    for (const f of c.riskFactors) {
      factorCounts.set(f, (factorCounts.get(f) ?? 0) + 1);
    }
  }
  const topRiskFactors = [...factorCounts.entries()]
    .map(([factor, count]) => ({ factor, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalCustomers,
    healthyCustomers,
    atRiskCustomers,
    churningCustomers,
    openComplaints,
    pendingRefunds,
    pendingCancellations,
    avgSatisfaction: Number(avgSatisfaction.toFixed(2)),
    issuesByType,
    topRiskFactors,
  };
}
