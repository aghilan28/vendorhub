import { createHash } from "crypto";
import type { LedgerDirection, LedgerEntryDraft } from "./marketplace-economics";

export type FinanceSourceType = "payment_capture" | "seller_payout" | "refund" | "settlement_adjustment" | "operational_correction";
export type LedgerConsistencyState = "BALANCED" | "IMBALANCED" | "EMPTY" | "INVALID_AMOUNT";

export interface FinanceJournalDraft {
  sourceType: FinanceSourceType;
  sourceId: string;
  sourceEventId: string;
  currency: "INR";
  description: string;
  entries: LedgerEntryDraft[];
  lineage: {
    orderId?: string;
    transactionId?: string;
    paymentAttemptId?: string;
    refundRequestId?: string;
    payoutBatchId?: string;
    providerEventId?: string;
  };
}

export interface LedgerConsistencyReport {
  state: LedgerConsistencyState;
  totalDebit: number;
  totalCredit: number;
  difference: number;
  replayKey: string;
  entryCount: number;
  repairActions: string[];
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function sumByDirection(entries: LedgerEntryDraft[], direction: LedgerDirection) {
  return money(entries.filter((entry) => entry.direction === direction).reduce((total, entry) => total + entry.amount, 0));
}

export function ledgerReplayKey(journal: Pick<FinanceJournalDraft, "sourceType" | "sourceId" | "sourceEventId" | "entries">) {
  return createHash("sha256")
    .update(JSON.stringify([journal.sourceType, journal.sourceId, journal.sourceEventId, journal.entries.map((entry) => [entry.accountCode, entry.direction, money(entry.amount), entry.partyType, entry.partyId ?? null])]))
    .digest("hex");
}

export function evaluateLedgerConsistency(journal: FinanceJournalDraft): LedgerConsistencyReport {
  const totalDebit = sumByDirection(journal.entries, "DEBIT");
  const totalCredit = sumByDirection(journal.entries, "CREDIT");
  const difference = money(totalDebit - totalCredit);
  const hasInvalidAmount = journal.entries.some((entry) => !Number.isFinite(entry.amount) || entry.amount <= 0);
  const state: LedgerConsistencyState = journal.entries.length < 2 ? "EMPTY" : hasInvalidAmount ? "INVALID_AMOUNT" : Math.abs(difference) > 0.009 ? "IMBALANCED" : "BALANCED";

  return {
    state,
    totalDebit,
    totalCredit,
    difference,
    replayKey: ledgerReplayKey(journal),
    entryCount: journal.entries.length,
    repairActions:
      state === "BALANCED"
        ? ["post immutable journal"]
        : state === "EMPTY"
          ? ["block posting", "rebuild entries from source transaction", "open ledger repair case"]
          : state === "INVALID_AMOUNT"
            ? ["block posting", "validate amount source", "quarantine source event"]
            : ["block posting", "compare source settlement totals", "open ledger imbalance case"],
  };
}

export function buildPaymentCaptureJournal(input: {
  orderId: string;
  transactionId: string;
  paymentAttemptId: string;
  vendorId: string;
  providerEventId: string;
  grossAmount: number;
  commissionAmount: number;
}): FinanceJournalDraft {
  const grossAmount = money(input.grossAmount);
  const commissionAmount = money(input.commissionAmount);
  const sellerNet = money(grossAmount - commissionAmount);

  return {
    sourceType: "payment_capture",
    sourceId: input.orderId,
    sourceEventId: `payment_capture:${input.providerEventId}:${input.orderId}`,
    currency: "INR",
    description: "Authoritative payment capture settlement journal.",
    lineage: {
      orderId: input.orderId,
      transactionId: input.transactionId,
      paymentAttemptId: input.paymentAttemptId,
      providerEventId: input.providerEventId,
    },
    entries: [
      { accountCode: "cash_gateway_clearing", partyType: "PAYMENT_PROVIDER", direction: "DEBIT", amount: grossAmount },
      { accountCode: "platform_escrow_liability", partyType: "PLATFORM", direction: "CREDIT", amount: grossAmount },
      { accountCode: "platform_escrow_liability", partyType: "PLATFORM", direction: "DEBIT", amount: grossAmount },
      { accountCode: "seller_payable", partyType: "SELLER", partyId: input.vendorId, direction: "CREDIT", amount: sellerNet },
      { accountCode: "platform_commission_revenue", partyType: "PLATFORM", direction: "CREDIT", amount: commissionAmount },
    ],
  };
}

export function buildPayoutReleaseJournal(input: {
  payoutBatchId: string;
  vendorId: string;
  providerPayoutId?: string | null;
  amount: number;
}): FinanceJournalDraft {
  const amount = money(input.amount);

  return {
    sourceType: "seller_payout",
    sourceId: input.payoutBatchId,
    sourceEventId: `payout_release:${input.providerPayoutId ?? input.payoutBatchId}`,
    currency: "INR",
    description: "Seller payout release journal.",
    lineage: {
      payoutBatchId: input.payoutBatchId,
      providerEventId: input.providerPayoutId ?? undefined,
    },
    entries: [
      { accountCode: "seller_payable", partyType: "SELLER", partyId: input.vendorId, direction: "DEBIT", amount },
      { accountCode: "bank_cash", partyType: "BANK", direction: "CREDIT", amount },
    ],
  };
}

export function buildRefundAccountingJournal(input: {
  refundRequestId: string;
  orderId: string;
  transactionId?: string;
  paymentAttemptId?: string;
  vendorId: string;
  providerRefundId?: string | null;
  refundAmount: number;
  commissionReversal: number;
}): FinanceJournalDraft {
  const refundAmount = money(input.refundAmount);
  const commissionReversal = money(input.commissionReversal);
  const sellerReversal = money(refundAmount - commissionReversal);

  return {
    sourceType: "refund",
    sourceId: input.refundRequestId,
    sourceEventId: `refund:${input.providerRefundId ?? input.refundRequestId}:processed`,
    currency: "INR",
    description: "Refund accounting reversal journal.",
    lineage: {
      refundRequestId: input.refundRequestId,
      orderId: input.orderId,
      transactionId: input.transactionId,
      paymentAttemptId: input.paymentAttemptId,
      providerEventId: input.providerRefundId ?? undefined,
    },
    entries: [
      { accountCode: "refund_liability", partyType: "PLATFORM", direction: "DEBIT", amount: refundAmount },
      { accountCode: "cash_gateway_clearing", partyType: "PAYMENT_PROVIDER", direction: "CREDIT", amount: refundAmount },
      { accountCode: "seller_payable", partyType: "SELLER", partyId: input.vendorId, direction: "DEBIT", amount: sellerReversal },
      { accountCode: "platform_commission_revenue", partyType: "PLATFORM", direction: "DEBIT", amount: commissionReversal },
      { accountCode: "refund_liability", partyType: "PLATFORM", direction: "CREDIT", amount: refundAmount },
    ],
  };
}
