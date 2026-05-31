/**
 * MCP-1E Phase 5 — Dispute Resolution Platform
 * Buyer-seller disputes, evidence management, workflow, and analytics
 */

import { createHash } from "crypto";
import type { Dispute, DisputeAnalytics, DisputeEvidence, DisputeEvent, DisputeResolution, DisputeStatus, DisputeType, OperationsRole } from "./types";

function generateId(seed: string): string {
  return createHash("sha256").update(seed).digest("hex").slice(0, 16);
}

function generateDisputeNumber(seed: string): string {
  const hash = createHash("sha256").update(seed).digest("hex").slice(0, 8).toUpperCase();
  return `DSP-${hash}`;
}

// ─── Dispute Status Machine ────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<DisputeStatus, DisputeStatus[]> = {
  filed: ["evidence_collection", "dismissed"],
  evidence_collection: ["under_review", "dismissed"],
  under_review: ["mediation", "resolved_buyer", "resolved_seller", "resolved_platform", "escalated"],
  mediation: ["resolved_buyer", "resolved_seller", "resolved_platform", "escalated"],
  escalated: ["resolved_buyer", "resolved_seller", "resolved_platform"],
  resolved_buyer: ["closed"],
  resolved_seller: ["closed"],
  resolved_platform: ["closed"],
  dismissed: ["closed"],
  closed: [],
};

export function canTransitionDispute(from: DisputeStatus, to: DisputeStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

// ─── Dispute Creation ──────────────────────────────────────────────────────────

export function createDispute(input: {
  type: DisputeType;
  buyerId: string;
  sellerId: string;
  orderId: string;
  amount: number;
  description: string;
}): Dispute {
  const now = new Date().toISOString();
  const id = generateId(`dispute-${input.buyerId}-${input.orderId}-${now}`);
  const slaDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  return {
    id,
    disputeNumber: generateDisputeNumber(id),
    type: input.type,
    status: "filed",
    buyerId: input.buyerId,
    sellerId: input.sellerId,
    orderId: input.orderId,
    amount: input.amount,
    currency: "INR",
    description: input.description,
    buyerEvidence: [],
    sellerEvidence: [],
    timeline: [{ id: generateId(`event-${id}-filed`), action: "dispute_filed", actor: input.buyerId, actorRole: "customer", detail: `Dispute filed: ${input.type}`, timestamp: now }],
    assignedTo: null,
    resolution: null,
    slaDeadline,
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
  };
}

// ─── Dispute Transitions ───────────────────────────────────────────────────────

export function transitionDispute(dispute: Dispute, newStatus: DisputeStatus, actor: string, actorRole: OperationsRole, detail: string): Dispute {
  if (!canTransitionDispute(dispute.status, newStatus)) {
    throw new Error(`Invalid dispute transition: ${dispute.status} → ${newStatus}`);
  }
  const now = new Date().toISOString();
  const event: DisputeEvent = { id: generateId(`event-${dispute.id}-${now}`), action: `status_${newStatus}`, actor, actorRole, detail, timestamp: now };

  return {
    ...dispute,
    status: newStatus,
    timeline: [...dispute.timeline, event],
    updatedAt: now,
    resolvedAt: newStatus.startsWith("resolved_") ? now : dispute.resolvedAt,
  };
}

// ─── Evidence Submission ───────────────────────────────────────────────────────

export function submitEvidence(dispute: Dispute, evidence: Omit<DisputeEvidence, "id" | "submittedAt">): Dispute {
  const now = new Date().toISOString();
  const e: DisputeEvidence = { ...evidence, id: generateId(`evidence-${dispute.id}-${now}`), submittedAt: now };
  const event: DisputeEvent = { id: generateId(`event-evidence-${now}`), action: "evidence_submitted", actor: evidence.submittedBy, actorRole: evidence.submittedByRole === "buyer" ? "customer" : "seller", detail: `${evidence.type} evidence submitted`, timestamp: now };

  const updated = { ...dispute, timeline: [...dispute.timeline, event], updatedAt: now };
  if (evidence.submittedByRole === "buyer") {
    return { ...updated, buyerEvidence: [...dispute.buyerEvidence, e] };
  }
  return { ...updated, sellerEvidence: [...dispute.sellerEvidence, e] };
}

// ─── Dispute Resolution ────────────────────────────────────────────────────────

export function resolveDispute(dispute: Dispute, resolution: Omit<DisputeResolution, "resolvedAt">): Dispute {
  const now = new Date().toISOString();
  const statusMap: Record<DisputeResolution["outcome"], DisputeStatus> = {
    buyer_wins: "resolved_buyer",
    seller_wins: "resolved_seller",
    split: "resolved_platform",
    platform_decision: "resolved_platform",
    mutual_agreement: "resolved_platform",
  };
  const newStatus = statusMap[resolution.outcome];
  const event: DisputeEvent = { id: generateId(`event-resolve-${now}`), action: "resolved", actor: resolution.resolvedBy, actorRole: "admin", detail: resolution.summary, timestamp: now };

  return {
    ...dispute,
    status: newStatus,
    resolution: { ...resolution, resolvedAt: now },
    timeline: [...dispute.timeline, event],
    updatedAt: now,
    resolvedAt: now,
  };
}

// ─── Dispute Analytics ─────────────────────────────────────────────────────────

export function computeDisputeAnalytics(disputes: Dispute[]): DisputeAnalytics {
  const totalDisputes = disputes.length;
  const openDisputes = disputes.filter((d) => !d.resolvedAt && d.status !== "closed" && d.status !== "dismissed").length;

  const resolved = disputes.filter((d) => d.resolvedAt);
  const avgResolutionDays = resolved.length > 0
    ? resolved.reduce((sum, d) => sum + (new Date(d.resolvedAt!).getTime() - new Date(d.createdAt).getTime()) / (24 * 60 * 60 * 1000), 0) / resolved.length
    : 0;

  const buyerWins = resolved.filter((d) => d.status === "resolved_buyer").length;
  const sellerWins = resolved.filter((d) => d.status === "resolved_seller").length;
  const splits = resolved.filter((d) => d.status === "resolved_platform").length;

  const buyerWinRate = resolved.length > 0 ? buyerWins / resolved.length : 0;
  const sellerWinRate = resolved.length > 0 ? sellerWins / resolved.length : 0;
  const splitRate = resolved.length > 0 ? splits / resolved.length : 0;

  const escalated = disputes.filter((d) => d.status === "escalated" || d.timeline.some((e) => e.action === "status_escalated")).length;
  const escalationRate = totalDisputes > 0 ? escalated / totalDisputes : 0;

  const disputesByType = {} as Record<DisputeType, number>;
  let totalAmount = 0;
  for (const d of disputes) {
    disputesByType[d.type] = (disputesByType[d.type] ?? 0) + 1;
    totalAmount += d.amount;
  }

  return {
    totalDisputes,
    openDisputes,
    avgResolutionDays: Number(avgResolutionDays.toFixed(1)),
    buyerWinRate: Number(buyerWinRate.toFixed(3)),
    sellerWinRate: Number(sellerWinRate.toFixed(3)),
    splitRate: Number(splitRate.toFixed(3)),
    disputesByType,
    escalationRate: Number(escalationRate.toFixed(3)),
    totalDisputeAmount: totalAmount,
    avgDisputeAmount: totalDisputes > 0 ? Math.round(totalAmount / totalDisputes) : 0,
  };
}
