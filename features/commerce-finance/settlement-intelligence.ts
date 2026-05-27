export type SettlementRisk = "healthy" | "delayed" | "mismatch" | "blocked";

export interface SettlementSignal {
  settlementId: string;
  expectedAmount: number;
  providerAmount?: number | null;
  ledgerAmount?: number | null;
  expectedPayoutAt: string;
  now?: string;
  lifecycleState: string;
  openReconciliationCases: number;
  providerSettlementId?: string | null;
}

export function evaluateSettlementSignal(signal: SettlementSignal) {
  const now = new Date(signal.now ?? new Date().toISOString()).getTime();
  const expectedPayoutAt = new Date(signal.expectedPayoutAt).getTime();
  const delayedHours = Math.max(0, (now - expectedPayoutAt) / 3_600_000);
  const providerDelta = Math.abs(signal.expectedAmount - Number(signal.providerAmount ?? signal.expectedAmount));
  const ledgerDelta = Math.abs(signal.expectedAmount - Number(signal.ledgerAmount ?? signal.expectedAmount));
  const mismatch = providerDelta > 1 || ledgerDelta > 1;
  const risk: SettlementRisk = signal.openReconciliationCases > 0 ? "blocked" : mismatch ? "mismatch" : delayedHours > 24 ? "delayed" : "healthy";

  return {
    settlementId: signal.settlementId,
    risk,
    delayedHours,
    providerDelta: Math.round(providerDelta * 100) / 100,
    ledgerDelta: Math.round(ledgerDelta * 100) / 100,
    auditable: Boolean(signal.providerSettlementId) || signal.lifecycleState !== "PAYOUT_COMPLETED",
    recoveryActions:
      risk === "healthy"
        ? ["continue settlement lifecycle"]
        : risk === "delayed"
          ? ["poll Razorpay settlement state", "keep payout delayed", "record settlement delay metric"]
          : risk === "mismatch"
            ? ["open settlement mismatch case", "compare provider settlement and ledger entries", "block payout release"]
            : ["hold settlement", "resolve open reconciliation cases", "escalate finance governance review"],
  };
}
