/**
 * EC-2 Phase 4 — Refund Platform
 * Full / partial / wallet / store-credit refunds with tracking, audit, store-credit ledger.
 * Bridges to the real Razorpay rail (gateway refund) for full/partial; wallet/store-credit are internal.
 */

import { createHash } from "crypto";
import type { AuditEntry, Money, Refund, RefundMode, RefundState, StoreCreditLedgerEntry } from "./types";

function id(seed: string): string {
  return createHash("sha256").update(seed).digest("hex").slice(0, 16);
}

function audit(actor: string, actorRole: AuditEntry["actorRole"], action: string, detail: string): AuditEntry {
  const at = new Date().toISOString();
  return { id: id(`aud-${action}-${at}-${detail}`), at, actor, actorRole, action, detail };
}

// ─── Refund amount resolution ────────────────────────────────────────────────────
export function resolveRefundAmount(mode: RefundMode, orderTotal: Money, partialAmount?: Money): Money {
  if (mode === "partial") {
    if (partialAmount == null || partialAmount <= 0) throw new Error("Partial refund requires a positive amount");
    if (partialAmount > orderTotal) throw new Error("Partial refund cannot exceed order total");
    return partialAmount;
  }
  // full, wallet, store_credit all refund the full order total unless partial specified
  return orderTotal;
}

// ─── Create Refund ─────────────────────────────────────────────────────────────
export function createRefund(input: {
  orderId: string;
  customerId: string;
  mode: RefundMode;
  orderTotal: Money;
  partialAmount?: Money;
  reason: string;
}): Refund {
  const amount = resolveRefundAmount(input.mode, input.orderTotal, input.partialAmount);
  const now = new Date().toISOString();
  const rid = id(`refund-${input.orderId}-${now}`);
  const isInternal = input.mode === "wallet" || input.mode === "store_credit";
  return {
    id: rid,
    orderId: input.orderId,
    customerId: input.customerId,
    mode: input.mode,
    orderTotal: input.orderTotal,
    amount,
    state: "INITIATED",
    gatewayReference: null,
    walletCredited: false,
    reason: input.reason,
    createdAt: now,
    completedAt: null,
    audit: [audit(input.customerId, "customer", "refund_initiated", `${input.mode} refund of ₹${amount}${isInternal ? " (internal)" : " (gateway)"}`)],
  };
}

// ─── State transitions ───────────────────────────────────────────────────────────
const REFUND_TRANSITIONS: Record<RefundState, RefundState[]> = {
  INITIATED: ["PROCESSING", "FAILED"],
  PROCESSING: ["COMPLETED", "FAILED"],
  COMPLETED: [],
  FAILED: ["INITIATED"],
};

export function canTransitionRefund(from: RefundState, to: RefundState): boolean {
  return REFUND_TRANSITIONS[from].includes(to);
}

export function markRefundProcessing(refund: Refund, gatewayReference: string | null, actor = "system"): Refund {
  if (!canTransitionRefund(refund.state, "PROCESSING")) throw new Error(`Invalid refund transition ${refund.state} → PROCESSING`);
  return {
    ...refund,
    state: "PROCESSING",
    gatewayReference,
    audit: [...refund.audit, audit(actor, "system", "refund_processing", gatewayReference ? `Gateway ref ${gatewayReference}` : "Internal processing")],
  };
}

export function completeRefund(refund: Refund, actor = "system"): Refund {
  if (!canTransitionRefund(refund.state, "COMPLETED")) throw new Error(`Invalid refund transition ${refund.state} → COMPLETED`);
  const now = new Date().toISOString();
  return {
    ...refund,
    state: "COMPLETED",
    completedAt: now,
    walletCredited: refund.mode === "wallet" || refund.mode === "store_credit",
    audit: [...refund.audit, audit(actor, "system", "refund_completed", `Refund completed (${refund.mode})`)],
  };
}

export function failRefund(refund: Refund, reason: string, actor = "system"): Refund {
  return {
    ...refund,
    state: "FAILED",
    audit: [...refund.audit, audit(actor, "system", "refund_failed", reason)],
  };
}

// ─── Store credit ledger ───────────────────────────────────────────────────────
export function creditStoreCredit(
  ledger: StoreCreditLedgerEntry[],
  input: { customerId: string; amount: Money; source: StoreCreditLedgerEntry["source"]; refundId?: string | null },
): StoreCreditLedgerEntry {
  const prior = ledger.filter((e) => e.customerId === input.customerId);
  const balance = prior.reduce((s, e) => s + e.amount, 0) + input.amount;
  return {
    id: id(`sc-${input.customerId}-${ledger.length}`),
    customerId: input.customerId,
    amount: input.amount,
    balanceAfter: balance,
    source: input.source,
    refundId: input.refundId ?? null,
    at: new Date().toISOString(),
  };
}

export function storeCreditBalance(ledger: StoreCreditLedgerEntry[], customerId: string): Money {
  return ledger.filter((e) => e.customerId === customerId).reduce((s, e) => s + e.amount, 0);
}

// ─── Analytics ──────────────────────────────────────────────────────────────────
export function refundAnalytics(refunds: Refund[]) {
  const total = refunds.length;
  const completed = refunds.filter((r) => r.state === "COMPLETED");
  const byMode: Record<RefundMode, number> = { full: 0, partial: 0, wallet: 0, store_credit: 0 };
  for (const r of refunds) byMode[r.mode]++;
  const totalRefunded = completed.reduce((s, r) => s + r.amount, 0);
  return {
    total,
    completed: completed.length,
    failed: refunds.filter((r) => r.state === "FAILED").length,
    totalRefunded,
    byMode,
  };
}
