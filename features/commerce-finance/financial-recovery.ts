import { evaluateFinanceTelemetry } from "./observability";

export type FinancialFailureMode =
  | "settlement_desync"
  | "payout_duplication_attempt"
  | "refund_replay_storm"
  | "reconciliation_backlog_explosion"
  | "financial_queue_congestion"
  | "delayed_webhook_flood"
  | "ledger_inconsistency"
  | "none";

export function financialRecoveryActions(mode: FinancialFailureMode) {
  const actions: Record<FinancialFailureMode, string[]> = {
    settlement_desync: ["block affected payout release", "poll provider settlement state", "open settlement mismatch case"],
    payout_duplication_attempt: ["enforce payout idempotency key", "quarantine duplicate provider event", "replay payout batch audit trail"],
    refund_replay_storm: ["deduplicate refund idempotency keys", "pause provider retry fanout", "rebuild refund ledger adjustments"],
    reconciliation_backlog_explosion: ["increase reconciliation batch size", "reserve reconciliation-control workers", "defer non-critical finance analytics"],
    financial_queue_congestion: ["prioritize commerce reconciliation queues", "shed optional analytics work", "extend retry backoff with jitter"],
    delayed_webhook_flood: ["dedupe webhook event ids", "process critical captured payments first", "record orphan webhook cases"],
    ledger_inconsistency: ["halt payout release", "replay immutable ledger events", "open critical ledger repair case"],
    none: ["normal finance operations"],
  };
  return actions[mode];
}

export function simulatePhase34FinanceLoad(input: {
  payoutFlood: number;
  settlementReplays: number;
  refundSpike: number;
  reconciliationBacklog: number;
  ledgerReplayFlood: number;
  webhookStorm: number;
  payoutRetryStorm: number;
}) {
  const queueSaturation = Math.min(1, input.reconciliationBacklog / 500 + input.webhookStorm / 5000 + input.ledgerReplayFlood / 3000);
  const telemetry = {
    payoutLatencyHours: Math.round(4 + input.payoutFlood / 200 + input.payoutRetryStorm / 60 + queueSaturation * 30),
    settlementDelayHours: Math.round(2 + input.settlementReplays / 80 + queueSaturation * 24),
    reconciliationDriftAmount: Math.round((input.settlementReplays * 0.4 + input.refundSpike * 0.25) * 100) / 100,
    refundAnomalyRate: Math.min(0.5, input.refundSpike / Math.max(1, input.webhookStorm + input.payoutFlood)),
    financialReplayFrequency: Math.min(0.4, (input.settlementReplays + input.ledgerReplayFlood) / Math.max(1, input.webhookStorm + input.payoutFlood + input.refundSpike)),
    payoutRecoveryRate: Math.max(0.2, 0.92 - input.payoutRetryStorm / 500 - queueSaturation * 0.25),
    ledgerInconsistencyCount: input.ledgerReplayFlood > 1200 ? 1 : 0,
    queueSaturation,
    financialRecoveryBacklog: Math.round(input.reconciliationBacklog + input.payoutRetryStorm * 0.5 + input.refundSpike * 0.25),
    payoutFailureRate: Math.min(0.4, input.payoutRetryStorm / Math.max(1, input.payoutFlood)),
    settlementMismatchRate: Math.min(0.3, input.settlementReplays / 3000),
  };

  return {
    telemetry,
    alerts: evaluateFinanceTelemetry(telemetry),
    durable: telemetry.ledgerInconsistencyCount === 0 || telemetry.financialReplayFrequency < 0.25,
    gracefulDegradation: queueSaturation < 0.95,
  };
}

export function simulatePhase34Failure(mode: FinancialFailureMode) {
  return {
    mode,
    actions: financialRecoveryActions(mode),
    financialTruthProtected: mode === "none" ? true : financialRecoveryActions(mode).length > 0,
    payoutReleaseSafe: mode !== "ledger_inconsistency" && mode !== "payout_duplication_attempt",
  };
}
