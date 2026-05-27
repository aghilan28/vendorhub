import { buildRefundAccountingJournal, evaluateLedgerConsistency } from "./ledger-operating-system";

export interface RefundAccountingInput {
  refundRequestId: string;
  orderId: string;
  transactionId?: string;
  paymentAttemptId?: string;
  vendorId: string;
  providerRefundId?: string | null;
  orderGrossAmount: number;
  settlementCommissionAmount: number;
  requestedRefundAmount: number;
  deliveryAdjustmentAmount?: number;
  itemRefundAmounts?: number[];
  disputeLinked?: boolean;
}

export function calculateRefundAccounting(input: RefundAccountingInput) {
  const itemRefundTotal = input.itemRefundAmounts?.reduce((total, amount) => total + amount, 0);
  const baseRefundAmount = typeof itemRefundTotal === "number" && itemRefundTotal > 0 ? itemRefundTotal : input.requestedRefundAmount;
  const refundAmount = Math.max(0, Math.round((baseRefundAmount + (input.deliveryAdjustmentAmount ?? 0)) * 100) / 100);
  const ratio = Math.min(1, refundAmount / Math.max(1, input.orderGrossAmount));
  const commissionReversal = Math.round(input.settlementCommissionAmount * ratio * 100) / 100;
  const journal = buildRefundAccountingJournal({
    refundRequestId: input.refundRequestId,
    orderId: input.orderId,
    transactionId: input.transactionId,
    paymentAttemptId: input.paymentAttemptId,
    vendorId: input.vendorId,
    providerRefundId: input.providerRefundId,
    refundAmount,
    commissionReversal,
  });
  const consistency = evaluateLedgerConsistency(journal);

  return {
    refundAmount,
    sellerReversal: Math.round((refundAmount - commissionReversal) * 100) / 100,
    commissionReversal,
    deliveryAdjustmentAmount: input.deliveryAdjustmentAmount ?? 0,
    partialRefund: refundAmount < input.orderGrossAmount,
    multiItemRefund: (input.itemRefundAmounts?.length ?? 0) > 1,
    disputeLinked: Boolean(input.disputeLinked),
    journal,
    consistency,
    recoveryActions:
      consistency.state === "BALANCED"
        ? ["post refund adjustment", "reconcile provider refund id", "update settlement available amount"]
        : ["block refund completion", "open refund accounting case", "rerun refund repair orchestration"],
  };
}
