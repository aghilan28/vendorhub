export type PayoutRiskLevel = "low" | "watch" | "hold" | "blocked";
export type PayoutDecision = "release" | "delay" | "hold" | "retry" | "block";

export interface PayoutOrchestrationInput {
  vendorId: string;
  availableAmount: number;
  settlementAgeHours: number;
  trustScore: number;
  openDisputes: number;
  refundRate: number;
  failedPayoutAttempts: number;
  payoutMethodReady: boolean;
  reconciliationOpenCases: number;
  queuePressure?: number;
}

export interface PayoutOrchestrationPlan {
  vendorId: string;
  decision: PayoutDecision;
  riskLevel: PayoutRiskLevel;
  scheduleAfterHours: number;
  maxBatchAmount: number;
  retryAllowed: boolean;
  reasons: string[];
  recoveryActions: string[];
}

function bounded(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function buildPayoutOrchestrationPlan(input: PayoutOrchestrationInput): PayoutOrchestrationPlan {
  const riskScore = bounded(
    (input.trustScore < 55 ? 0.28 : 0) +
      Math.min(0.22, input.openDisputes * 0.06) +
      Math.min(0.18, input.refundRate * 0.7) +
      Math.min(0.18, input.failedPayoutAttempts * 0.07) +
      Math.min(0.16, input.reconciliationOpenCases * 0.04) +
      (!input.payoutMethodReady ? 0.35 : 0) +
      Math.min(0.12, input.queuePressure ?? 0),
  );
  const riskLevel: PayoutRiskLevel = !input.payoutMethodReady || riskScore > 0.72 ? "blocked" : riskScore > 0.48 ? "hold" : riskScore > 0.24 ? "watch" : "low";
  const decision: PayoutDecision =
    riskLevel === "blocked"
      ? "block"
      : input.failedPayoutAttempts > 0 && input.failedPayoutAttempts < 3
        ? "retry"
        : riskLevel === "hold"
          ? "hold"
          : input.settlementAgeHours < 24 || riskLevel === "watch"
            ? "delay"
            : "release";

  return {
    vendorId: input.vendorId,
    decision,
    riskLevel,
    scheduleAfterHours: decision === "release" ? 0 : decision === "retry" ? Math.min(24, 2 ** input.failedPayoutAttempts) : riskLevel === "watch" ? 24 : 72,
    maxBatchAmount: riskLevel === "low" ? input.availableAmount : riskLevel === "watch" ? Math.round(input.availableAmount * 0.5 * 100) / 100 : 0,
    retryAllowed: input.failedPayoutAttempts < 3 && riskLevel !== "blocked",
    reasons: [
      input.payoutMethodReady ? "payout method ready" : "payout method requires review",
      `trust score ${input.trustScore}`,
      `${input.openDisputes} open disputes`,
      `${Math.round(input.refundRate * 100)}% refund rate`,
      `${input.reconciliationOpenCases} open finance cases`,
    ],
    recoveryActions:
      decision === "release"
        ? ["create seller payout batch", "record payout audit trail", "subscribe realtime payout updates"]
        : decision === "retry"
          ? ["verify provider payout state", "retry failed payout batch", "record retry idempotency key"]
          : decision === "delay"
            ? ["wait for settlement maturity", "rerun reconciliation before release", "keep seller payout visibility updated"]
            : decision === "hold"
              ? ["place payout hold", "escalate finance governance review", "resolve disputes before release"]
              : ["block payout", "review payout method and trust posture", "open critical finance case"],
  };
}
