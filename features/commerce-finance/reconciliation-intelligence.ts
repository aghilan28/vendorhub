export type ReconciliationDomain = "payment" | "settlement" | "payout" | "refund" | "fee" | "logistics" | "dispute" | "ledger";
export type ReconciliationSeverity = "info" | "warning" | "critical";

export interface ReconciliationSignal {
  domain: ReconciliationDomain;
  expectedAmount?: number | null;
  observedAmount?: number | null;
  ageHours: number;
  replayCount: number;
  backlogCount: number;
  providerState?: string | null;
  internalState?: string | null;
}

export interface ReconciliationDiagnosis {
  domain: ReconciliationDomain;
  driftAmount: number;
  driftRatio: number;
  delayed: boolean;
  replayAnomaly: boolean;
  severity: ReconciliationSeverity;
  eventuallyConsistent: boolean;
  recoveryActions: string[];
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

export function diagnoseReconciliation(signal: ReconciliationSignal): ReconciliationDiagnosis {
  const expected = Number(signal.expectedAmount ?? 0);
  const observed = Number(signal.observedAmount ?? 0);
  const driftAmount = money(Math.abs(expected - observed));
  const driftRatio = expected > 0 ? driftAmount / expected : driftAmount > 0 ? 1 : 0;
  const delayed = signal.ageHours > (signal.domain === "payout" ? 24 : 6);
  const replayAnomaly = signal.replayCount > 2;
  const severeBacklog = signal.backlogCount > 250;
  const severity: ReconciliationSeverity = driftRatio > 0.05 || severeBacklog || replayAnomaly ? "critical" : driftAmount > 1 || delayed || signal.backlogCount > 50 ? "warning" : "info";

  return {
    domain: signal.domain,
    driftAmount,
    driftRatio,
    delayed,
    replayAnomaly,
    severity,
    eventuallyConsistent: severity !== "critical" || signal.domain !== "ledger",
    recoveryActions:
      severity === "info"
        ? ["continue scheduled reconciliation"]
        : replayAnomaly
          ? ["deduplicate replay events", "audit idempotency keys", "rebuild reconciliation case fingerprint"]
          : driftRatio > 0.05
            ? ["open finance reconciliation case", "compare provider and ledger totals", "block payout release until resolved"]
            : delayed
              ? ["rerun reconciliation worker", "poll provider settlement state", "keep affected payout on hold"]
              : ["increase reconciliation batch size", "monitor queue pressure", "prioritize finance worker pool"],
  };
}

export function summarizeReconciliationHealth(signals: ReconciliationSignal[]) {
  const diagnoses = signals.map(diagnoseReconciliation);
  return {
    diagnoses,
    criticalCount: diagnoses.filter((item) => item.severity === "critical").length,
    warningCount: diagnoses.filter((item) => item.severity === "warning").length,
    maxDriftAmount: Math.max(0, ...diagnoses.map((item) => item.driftAmount)),
    replayAnomalies: diagnoses.filter((item) => item.replayAnomaly).length,
    recoveryBacklog: diagnoses.filter((item) => item.severity !== "info").length,
  };
}
