export interface FinanceTelemetry {
  payoutLatencyHours: number;
  settlementDelayHours: number;
  reconciliationDriftAmount: number;
  refundAnomalyRate: number;
  financialReplayFrequency: number;
  payoutRecoveryRate: number;
  ledgerInconsistencyCount: number;
  queueSaturation: number;
  financialRecoveryBacklog: number;
  payoutFailureRate?: number;
  settlementMismatchRate?: number;
}

export interface FinanceAlert {
  id: string;
  severity: "info" | "warning" | "critical";
  signal: string;
  action: string;
}

export function evaluateFinanceTelemetry(input: FinanceTelemetry): FinanceAlert[] {
  const alerts: FinanceAlert[] = [];
  if (input.ledgerInconsistencyCount > 0) alerts.push({ id: "ledger-corruption-risk", severity: input.ledgerInconsistencyCount > 2 ? "critical" : "warning", signal: `${input.ledgerInconsistencyCount} ledger inconsistencies`, action: "Block payout release and replay affected ledger journals from immutable source events." });
  if (input.reconciliationDriftAmount > 1) alerts.push({ id: "reconciliation-drift", severity: input.reconciliationDriftAmount > 100 ? "critical" : "warning", signal: `INR ${input.reconciliationDriftAmount.toFixed(2)} reconciliation drift`, action: "Open finance reconciliation cases and compare provider, settlement, and ledger totals." });
  if (input.payoutLatencyHours > 48 || (input.payoutFailureRate ?? 0) > 0.05) alerts.push({ id: "payout-failure-or-delay", severity: input.payoutLatencyHours > 96 || (input.payoutFailureRate ?? 0) > 0.12 ? "critical" : "warning", signal: `${input.payoutLatencyHours}h payout latency`, action: "Inspect failed payout batches, retry eligible payouts, and keep trust-aware holds active." });
  if (input.settlementDelayHours > 36 || (input.settlementMismatchRate ?? 0) > 0.03) alerts.push({ id: "settlement-mismatch", severity: input.settlementDelayHours > 96 || (input.settlementMismatchRate ?? 0) > 0.08 ? "critical" : "warning", signal: `${input.settlementDelayHours}h settlement delay`, action: "Poll Razorpay settlement state, block affected payouts, and record settlement correction evidence." });
  if (input.refundAnomalyRate > 0.08) alerts.push({ id: "refund-spike", severity: input.refundAnomalyRate > 0.18 ? "critical" : "warning", signal: `${Math.round(input.refundAnomalyRate * 100)}% refund anomaly rate`, action: "Run refund reconciliation, inspect dispute-linked refunds, and verify refund ledger reversals." });
  if (input.financialReplayFrequency > 0.04) alerts.push({ id: "financial-replay-anomalies", severity: input.financialReplayFrequency > 0.1 ? "critical" : "warning", signal: `${Math.round(input.financialReplayFrequency * 100)}% replay frequency`, action: "Audit idempotency keys, webhook dedupe, payout retry keys, and durable event routing." });
  if (input.queueSaturation > 0.78 || input.financialRecoveryBacklog > 100) alerts.push({ id: "finance-queue-saturation", severity: input.queueSaturation > 0.92 || input.financialRecoveryBacklog > 250 ? "critical" : "warning", signal: `${Math.round(input.queueSaturation * 100)}% queue saturation, ${input.financialRecoveryBacklog} recovery backlog`, action: "Reserve reconciliation-control workers and defer non-financial bulk jobs." });
  if (input.payoutRecoveryRate < 0.65 && input.financialRecoveryBacklog > 0) alerts.push({ id: "payout-recovery-degradation", severity: input.payoutRecoveryRate < 0.35 ? "critical" : "warning", signal: `${Math.round(input.payoutRecoveryRate * 100)}% payout recovery rate`, action: "Review payout methods, retry policy, provider state, and governance holds." });

  return alerts.length ? alerts : [{ id: "finance-operating-healthy", severity: "info", signal: "Finance operating telemetry is within guardrails", action: "Continue ledger, reconciliation, payout, settlement, and refund monitoring." }];
}
