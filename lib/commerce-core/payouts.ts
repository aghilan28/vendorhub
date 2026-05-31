/**
 * EC-2 Phase 2 — Seller Payout System
 * Ledger, settlement tracking, mandated status lifecycle, earnings.
 * Deterministic + degrade-safe (operates on provided records; DB persistence via actions).
 */

import { createHash } from "crypto";
import type {
  AuditEntry,
  Money,
  Payout,
  PayoutStatus,
  SellerEarningsSummary,
  SellerLedgerEntry,
  LedgerEntryType,
} from "./types";

export const DEFAULT_COMMISSION_RATE = 0.08;

function id(seed: string): string {
  return createHash("sha256").update(seed).digest("hex").slice(0, 16);
}

function audit(actor: string, actorRole: AuditEntry["actorRole"], action: string, detail: string): AuditEntry {
  const at = new Date().toISOString();
  return { id: id(`aud-${action}-${at}-${detail}`), at, actor, actorRole, action, detail };
}

// ─── Payout Status Lifecycle (mandated taxonomy) ────────────────────────────────
const PAYOUT_TRANSITIONS: Record<PayoutStatus, PayoutStatus[]> = {
  PENDING: ["PROCESSING", "FAILED"],
  PROCESSING: ["SETTLED", "FAILED"],
  SETTLED: ["REVERSED"],
  FAILED: ["PENDING"], // retry
  REVERSED: [],
};

export function canTransitionPayout(from: PayoutStatus, to: PayoutStatus): boolean {
  return PAYOUT_TRANSITIONS[from].includes(to);
}

// ─── Ledger ──────────────────────────────────────────────────────────────────
export function appendLedgerEntry(
  ledger: SellerLedgerEntry[],
  input: { sellerId: string; orderId: string | null; type: LedgerEntryType; amount: Money; note: string },
): SellerLedgerEntry {
  const prior = ledger.filter((e) => e.sellerId === input.sellerId);
  const balance = prior.reduce((s, e) => s + e.amount, 0) + input.amount;
  return {
    id: id(`led-${input.sellerId}-${ledger.length}-${input.type}`),
    sellerId: input.sellerId,
    orderId: input.orderId,
    type: input.type,
    amount: input.amount,
    balanceAfter: balance,
    note: input.note,
    at: new Date().toISOString(),
  };
}

/** Records a sale: credits seller net of commission, returns the two ledger entries. */
export function recordSale(
  ledger: SellerLedgerEntry[],
  input: { sellerId: string; orderId: string; grossAmount: Money; commissionRate?: number },
): SellerLedgerEntry[] {
  const rate = input.commissionRate ?? DEFAULT_COMMISSION_RATE;
  const commission = Math.round(input.grossAmount * rate);
  const sale = appendLedgerEntry(ledger, { sellerId: input.sellerId, orderId: input.orderId, type: "SALE", amount: input.grossAmount, note: `Sale ${input.orderId}` });
  const comm = appendLedgerEntry([...ledger, sale], { sellerId: input.sellerId, orderId: input.orderId, type: "COMMISSION", amount: -commission, note: `Commission ${(rate * 100).toFixed(0)}%` });
  return [sale, comm];
}

// ─── Payout Creation & Transitions ──────────────────────────────────────────────
export function createPayout(input: {
  sellerId: string;
  grossAmount: Money;
  commission: Money;
  refundAdjustments?: Money;
  ledgerEntryIds?: string[];
}): Payout {
  const refundAdjustments = input.refundAdjustments ?? 0;
  const netAmount = input.grossAmount - input.commission - refundAdjustments;
  const now = new Date().toISOString();
  const pid = id(`payout-${input.sellerId}-${now}`);
  return {
    id: pid,
    sellerId: input.sellerId,
    status: "PENDING",
    grossAmount: input.grossAmount,
    commission: input.commission,
    refundAdjustments,
    netAmount,
    ledgerEntryIds: input.ledgerEntryIds ?? [],
    reference: `VHPO${pid.slice(0, 8).toUpperCase()}`,
    initiatedAt: now,
    settledAt: null,
    failureReason: null,
    audit: [audit("system", "system", "payout_created", `PENDING payout of ₹${netAmount}`)],
  };
}

export function transitionPayout(
  payout: Payout,
  to: PayoutStatus,
  actor: string,
  actorRole: AuditEntry["actorRole"],
  reason?: string,
): Payout {
  if (!canTransitionPayout(payout.status, to)) {
    throw new Error(`Invalid payout transition: ${payout.status} → ${to}`);
  }
  const now = new Date().toISOString();
  return {
    ...payout,
    status: to,
    settledAt: to === "SETTLED" ? now : payout.settledAt,
    failureReason: to === "FAILED" ? (reason ?? "Unknown failure") : payout.failureReason,
    audit: [...payout.audit, audit(actor, actorRole, `payout_${to.toLowerCase()}`, reason ?? `→ ${to}`)],
  };
}

// ─── Earnings Summary ──────────────────────────────────────────────────────────
export function computeEarnings(sellerId: string, ledger: SellerLedgerEntry[], payouts: Payout[]): SellerEarningsSummary {
  const entries = ledger.filter((e) => e.sellerId === sellerId);
  const lifetimeGross = entries.filter((e) => e.type === "SALE").reduce((s, e) => s + e.amount, 0);
  const lifetimeCommission = Math.abs(entries.filter((e) => e.type === "COMMISSION").reduce((s, e) => s + e.amount, 0));
  const refundAdj = Math.abs(entries.filter((e) => e.type === "REFUND_ADJUSTMENT").reduce((s, e) => s + e.amount, 0));
  const lifetimeNet = lifetimeGross - lifetimeCommission - refundAdj;

  const sellerPayouts = payouts.filter((p) => p.sellerId === sellerId);
  const settledTotal = sellerPayouts.filter((p) => p.status === "SETTLED").reduce((s, p) => s + p.netAmount, 0);
  const inFlight = sellerPayouts.filter((p) => p.status === "PENDING" || p.status === "PROCESSING").reduce((s, p) => s + p.netAmount, 0);

  const payoutsByStatus: Record<PayoutStatus, number> = { PENDING: 0, PROCESSING: 0, SETTLED: 0, FAILED: 0, REVERSED: 0 };
  for (const p of sellerPayouts) payoutsByStatus[p.status]++;

  const availableBalance = Math.max(0, lifetimeNet - settledTotal - inFlight);

  return {
    sellerId,
    lifetimeGross,
    lifetimeCommission,
    lifetimeNet,
    pendingBalance: inFlight,
    availableBalance,
    settledTotal,
    payoutsByStatus,
  };
}
