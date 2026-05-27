export type SettlementLifecycleState =
  | "PENDING_SETTLEMENT"
  | "PROCESSING_SETTLEMENT"
  | "SETTLED"
  | "PAYOUT_PENDING"
  | "PAYOUT_PROCESSING"
  | "PAYOUT_COMPLETED"
  | "PAYOUT_FAILED"
  | "REFUND_ADJUSTED"
  | "DISPUTED";

export type PayoutBatchState = "DRAFT" | "PROCESSING" | "COMPLETED" | "FAILED" | "RETRYING" | "CANCELLED";

export type LedgerDirection = "DEBIT" | "CREDIT";

export type LedgerEntryDraft = {
  accountCode: string;
  direction: LedgerDirection;
  amount: number;
  partyType: "BUYER" | "SELLER" | "PLATFORM" | "PAYMENT_PROVIDER" | "BANK" | "SYSTEM";
  partyId?: string | null;
};

export type CommissionRuleDraft = {
  id: string;
  scope: "DEFAULT" | "CATEGORY" | "SELLER_TIER" | "SELLER_OVERRIDE" | "PROMOTIONAL_OVERRIDE";
  rateBps: number;
  fixedFeeAmount?: number;
  priority?: number;
  explanation: string;
  vendorId?: string | null;
  categoryId?: string | null;
};

export type CommissionInput = {
  orderId: string;
  vendorId: string;
  categoryId?: string | null;
  grossAmount: number;
  rules: CommissionRuleDraft[];
};

export function assertBalancedJournal(entries: LedgerEntryDraft[]) {
  const debit = entries.filter((entry) => entry.direction === "DEBIT").reduce((total, entry) => total + entry.amount, 0);
  const credit = entries.filter((entry) => entry.direction === "CREDIT").reduce((total, entry) => total + entry.amount, 0);
  return Math.round(debit * 100) === Math.round(credit * 100) && debit > 0;
}

export function calculateCommission(input: CommissionInput) {
  const sortedRules = [...input.rules]
    .filter((rule) => rule.scope === "DEFAULT" || rule.vendorId === input.vendorId || rule.categoryId === input.categoryId)
    .sort((a, b) => {
      const rank = (rule: CommissionRuleDraft) => {
        if (rule.scope === "SELLER_OVERRIDE" && rule.vendorId === input.vendorId) return 1;
        if (rule.scope === "SELLER_TIER" && rule.vendorId === input.vendorId) return 2;
        if (rule.scope === "CATEGORY" && rule.categoryId === input.categoryId) return 3;
        if (rule.scope === "PROMOTIONAL_OVERRIDE") return 4;
        return 9;
      };
      return rank(a) - rank(b) || (a.priority ?? 100) - (b.priority ?? 100);
    });
  const rule = sortedRules[0];

  if (!rule) {
    throw new Error("Commission rule not found");
  }

  const commissionAmount = Math.min(input.grossAmount, Math.round((input.grossAmount * rule.rateBps / 10000 + (rule.fixedFeeAmount ?? 0)) * 100) / 100);

  return {
    orderId: input.orderId,
    ruleId: rule.id,
    rateBps: rule.rateBps,
    fixedFeeAmount: rule.fixedFeeAmount ?? 0,
    basisAmount: input.grossAmount,
    commissionAmount,
    sellerNetAmount: Math.max(0, Math.round((input.grossAmount - commissionAmount) * 100) / 100),
    explanation: rule.explanation,
  };
}

export function buildSettlementLedgerEntries(input: { grossAmount: number; commissionAmount: number; vendorId: string }): LedgerEntryDraft[] {
  const sellerNet = Math.max(0, Math.round((input.grossAmount - input.commissionAmount) * 100) / 100);
  return [
    { accountCode: "cash_gateway_clearing", partyType: "PAYMENT_PROVIDER", direction: "DEBIT", amount: input.grossAmount },
    { accountCode: "platform_escrow_liability", partyType: "PLATFORM", direction: "CREDIT", amount: input.grossAmount },
    { accountCode: "platform_escrow_liability", partyType: "PLATFORM", direction: "DEBIT", amount: input.grossAmount },
    { accountCode: "seller_payable", partyType: "SELLER", partyId: input.vendorId, direction: "CREDIT", amount: sellerNet },
    { accountCode: "platform_commission_revenue", partyType: "PLATFORM", direction: "CREDIT", amount: input.commissionAmount },
  ];
}

export function calculateRefundAdjustment(input: { refundAmount: number; settlementGross: number; settlementCommission: number }) {
  const ratio = Math.min(1, input.refundAmount / Math.max(1, input.settlementGross));
  const commissionReversal = Math.round(input.settlementCommission * ratio * 100) / 100;
  const sellerReversal = Math.max(0, Math.round((input.refundAmount - commissionReversal) * 100) / 100);

  return {
    sellerReversal,
    commissionReversal,
    entriesBalance: assertBalancedJournal([
      { accountCode: "refund_liability", partyType: "PLATFORM", direction: "DEBIT", amount: input.refundAmount },
      { accountCode: "cash_gateway_clearing", partyType: "PAYMENT_PROVIDER", direction: "CREDIT", amount: input.refundAmount },
      { accountCode: "seller_payable", partyType: "SELLER", direction: "DEBIT", amount: sellerReversal },
      { accountCode: "platform_commission_revenue", partyType: "PLATFORM", direction: "DEBIT", amount: commissionReversal },
      { accountCode: "refund_liability", partyType: "PLATFORM", direction: "CREDIT", amount: sellerReversal + commissionReversal },
    ]),
  };
}

export function canTransitionSettlement(from: SettlementLifecycleState, to: SettlementLifecycleState) {
  const allowed: Record<SettlementLifecycleState, SettlementLifecycleState[]> = {
    PENDING_SETTLEMENT: ["PROCESSING_SETTLEMENT", "REFUND_ADJUSTED", "DISPUTED"],
    PROCESSING_SETTLEMENT: ["SETTLED", "PAYOUT_PENDING", "REFUND_ADJUSTED", "DISPUTED"],
    SETTLED: ["PAYOUT_PENDING", "REFUND_ADJUSTED", "DISPUTED"],
    PAYOUT_PENDING: ["PAYOUT_PROCESSING", "REFUND_ADJUSTED", "DISPUTED"],
    PAYOUT_PROCESSING: ["PAYOUT_COMPLETED", "PAYOUT_FAILED", "DISPUTED"],
    PAYOUT_COMPLETED: ["REFUND_ADJUSTED", "DISPUTED"],
    PAYOUT_FAILED: ["PAYOUT_PROCESSING", "DISPUTED"],
    REFUND_ADJUSTED: ["PAYOUT_PENDING", "PAYOUT_PROCESSING", "DISPUTED"],
    DISPUTED: ["PENDING_SETTLEMENT", "REFUND_ADJUSTED"],
  };
  return allowed[from].includes(to);
}

export function nextPayoutRetryState(state: PayoutBatchState, retryCount: number) {
  if (state !== "FAILED") return state;
  return retryCount >= 3 ? "FAILED" : "RETRYING";
}
