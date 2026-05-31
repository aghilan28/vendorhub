/**
 * EC-2 Phase 3 — Returns Platform
 * Complete return lifecycle: customer request → seller decision → admin override → completion.
 */

import { createHash } from "crypto";
import type { AuditEntry, ReturnReason, ReturnRequest, ReturnStatus } from "./types";

function id(seed: string): string {
  return createHash("sha256").update(seed).digest("hex").slice(0, 16);
}

function audit(actor: string, actorRole: AuditEntry["actorRole"], action: string, detail: string): AuditEntry {
  const at = new Date().toISOString();
  return { id: id(`aud-${action}-${at}-${detail}`), at, actor, actorRole, action, detail };
}

// ─── Return Lifecycle State Machine ─────────────────────────────────────────────
const RETURN_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  REQUESTED: ["UNDER_REVIEW", "REJECTED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["IN_TRANSIT"],
  REJECTED: [],
  IN_TRANSIT: ["RECEIVED"],
  RECEIVED: ["COMPLETED"],
  COMPLETED: [],
};

export function canTransitionReturn(from: ReturnStatus, to: ReturnStatus): boolean {
  return RETURN_TRANSITIONS[from].includes(to);
}

export const RETURN_WINDOW_DAYS = 7;

const VALID_REASONS: ReturnReason[] = ["defective", "damaged", "wrong_item", "not_as_described", "size_fit", "changed_mind", "other"];

// ─── Eligibility ───────────────────────────────────────────────────────────────
export function isReturnEligible(input: { deliveredAt: string | null; now?: string; windowDays?: number }): { eligible: boolean; reason: string } {
  if (!input.deliveredAt) return { eligible: false, reason: "Order not yet delivered" };
  const window = input.windowDays ?? RETURN_WINDOW_DAYS;
  const now = new Date(input.now ?? new Date().toISOString());
  const daysSince = (now.getTime() - new Date(input.deliveredAt).getTime()) / (24 * 60 * 60 * 1000);
  if (daysSince > window) return { eligible: false, reason: `Return window (${window} days) expired` };
  return { eligible: true, reason: "Within return window" };
}

// ─── Customer: Request Return ────────────────────────────────────────────────────
export function createReturnRequest(input: {
  orderId: string;
  orderItemId?: string | null;
  buyerId: string;
  sellerId: string;
  reason: ReturnReason;
  description: string;
  evidencePaths?: string[];
}): ReturnRequest {
  if (!VALID_REASONS.includes(input.reason)) {
    throw new Error(`Invalid return reason: ${input.reason}`);
  }
  if (!input.description || input.description.trim().length < 5) {
    throw new Error("Return description must be at least 5 characters");
  }
  const now = new Date().toISOString();
  const rid = id(`return-${input.orderId}-${input.buyerId}-${now}`);
  return {
    id: rid,
    orderId: input.orderId,
    orderItemId: input.orderItemId ?? null,
    buyerId: input.buyerId,
    sellerId: input.sellerId,
    status: "REQUESTED",
    reason: input.reason,
    description: input.description.trim(),
    evidencePaths: input.evidencePaths ?? [],
    refundId: null,
    resolutionNote: null,
    createdAt: now,
    updatedAt: now,
    audit: [audit(input.buyerId, "customer", "return_requested", `Return requested: ${input.reason}`)],
  };
}

// ─── Transition (seller/admin) ───────────────────────────────────────────────────
export function transitionReturn(
  req: ReturnRequest,
  to: ReturnStatus,
  actor: string,
  actorRole: AuditEntry["actorRole"],
  note?: string,
): ReturnRequest {
  if (!canTransitionReturn(req.status, to)) {
    throw new Error(`Invalid return transition: ${req.status} → ${to}`);
  }
  const now = new Date().toISOString();
  return {
    ...req,
    status: to,
    resolutionNote: note ?? req.resolutionNote,
    updatedAt: now,
    audit: [...req.audit, audit(actor, actorRole, `return_${to.toLowerCase()}`, note ?? `→ ${to}`)],
  };
}

export function approveReturn(req: ReturnRequest, sellerId: string, note?: string): ReturnRequest {
  const reviewing = req.status === "REQUESTED" ? transitionReturn(req, "UNDER_REVIEW", sellerId, "seller", "Seller reviewing") : req;
  return transitionReturn(reviewing, "APPROVED", sellerId, "seller", note ?? "Return approved");
}

export function rejectReturn(req: ReturnRequest, actor: string, actorRole: AuditEntry["actorRole"], reason: string): ReturnRequest {
  const reviewing = req.status === "REQUESTED" ? transitionReturn(req, "UNDER_REVIEW", actor, actorRole, "Reviewing") : req;
  return transitionReturn(reviewing, "REJECTED", actor, actorRole, reason);
}

export function linkRefund(req: ReturnRequest, refundId: string): ReturnRequest {
  return { ...req, refundId, updatedAt: new Date().toISOString(), audit: [...req.audit, audit("system", "system", "refund_linked", `Refund ${refundId} linked`)] };
}

// ─── Analytics ──────────────────────────────────────────────────────────────────
export function returnsByStatus(requests: ReturnRequest[]): Record<ReturnStatus, number> {
  const counts: Record<ReturnStatus, number> = { REQUESTED: 0, UNDER_REVIEW: 0, APPROVED: 0, REJECTED: 0, IN_TRANSIT: 0, RECEIVED: 0, COMPLETED: 0 };
  for (const r of requests) counts[r.status]++;
  return counts;
}
