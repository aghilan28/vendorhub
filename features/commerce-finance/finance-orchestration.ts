import { enqueueAsyncJob, idempotencyKeyFor, persistDurableEvent } from "@/lib/async/orchestrator";
import type { Json } from "@/types/database";

export type FinanceRefreshReason =
  | "payment_webhook"
  | "reconciliation_drift"
  | "refund_replay"
  | "payout_retry"
  | "settlement_delay"
  | "ledger_repair"
  | "realtime_finance_update";

export async function enqueueFinanceOperatingJob(input: {
  reason: FinanceRefreshReason;
  vendorId?: string;
  orderId?: string;
  transactionId?: string;
  refundId?: string;
  payoutBatchId?: string;
  batchSize?: number;
  trace?: Record<string, Json | undefined>;
}) {
  const key = idempotencyKeyFor(["phase34-finance", input.reason, input.vendorId, input.orderId, input.transactionId, input.refundId, input.payoutBatchId, input.batchSize]);
  const payload = {
    reason: input.reason,
    vendorId: input.vendorId,
    orderId: input.orderId,
    transactionId: input.transactionId,
    refundId: input.refundId,
    payoutBatchId: input.payoutBatchId,
    batchSize: input.batchSize ?? 100,
  };

  await persistDurableEvent({
    source: "finance-operating-system",
    eventKey: key,
    eventType:
      input.reason === "refund_replay"
        ? "payment.refund.requested"
        : input.reason === "payout_retry"
          ? "payment.payout.verification_requested"
          : input.reason === "realtime_finance_update"
            ? "realtime.invalidation.requested"
            : "payment.reconciliation.requested",
    payload,
    subjectType: input.payoutBatchId ? "payout_batch" : input.refundId ? "refund" : input.orderId ? "order" : input.vendorId ? "vendor" : "finance",
    subjectId: input.payoutBatchId ?? input.refundId ?? input.orderId ?? input.vendorId,
    trace: input.trace,
    metadata: { phase: "34", replaySafe: true },
  });

  return enqueueAsyncJob({
    name:
      input.reason === "refund_replay"
        ? "payment.refund.sync"
        : input.reason === "payout_retry"
          ? "payment.payout.verify"
          : input.reason === "realtime_finance_update"
            ? "realtime.invalidation.flush"
            : "payment.reconciliation.run",
    payload,
    idempotencyKey: key,
    priority: input.reason === "ledger_repair" || input.reason === "payment_webhook" ? "critical" : "high",
    trace: input.trace,
    metadata: { phase: "34", replaySafe: true, financeOperatingSystem: true },
  });
}
