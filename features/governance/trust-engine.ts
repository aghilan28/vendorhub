export type GovernanceRiskSignalType =
  | "REFUND_ABUSE"
  | "PAYOUT_ABUSE"
  | "FAKE_INVENTORY"
  | "ORDER_BURST"
  | "SELLER_MANIPULATION"
  | "ACCOUNT_FARMING"
  | "CANCELLATION_SPIKE"
  | "DELIVERY_FAILURE_SPIKE"
  | "MODERATION_HISTORY"
  | "KYC_INCOMPLETE"
  | "TRUST_MANIPULATION"
  | "REVIEW_MANIPULATION";

export type GovernanceEnforcementType =
  | "SELLER_THROTTLE"
  | "PAYOUT_HOLD"
  | "LISTING_HIDE"
  | "VERIFICATION_REQUIRED"
  | "MANUAL_REVIEW"
  | "SELLER_SUSPENSION"
  | "WARNING";

export type TrustSignalInput = {
  orders: number;
  cancellations: number;
  refunds: number;
  disputes: number;
  failedDeliveries: number;
  openFlags: number;
  activeEnforcements: number;
  failedPayouts: number;
  verificationState:
    | "NOT_SUBMITTED"
    | "PENDING_REVIEW"
    | "UNDER_REVIEW"
    | "VERIFIED"
    | "REJECTED"
    | "EXPIRED"
    | "ESCALATION_REQUIRED"
    | "RESUBMISSION_REQUIRED"
    | "SUSPENDED";
  suspiciousOrderBursts?: number;
  reviewAnomalies?: number;
};

export type RiskSignal = {
  type: GovernanceRiskSignalType;
  score: number;
  severity: "low" | "medium" | "high" | "critical";
  explanation: string;
};

export function trustLevelForScore(score: number) {
  if (score < 35) return "restricted";
  if (score < 55) return "emerging";
  if (score < 75) return "standard";
  if (score < 90) return "trusted";
  return "verified_plus";
}

function boundedScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function ratio(part: number, total: number) {
  return total ? part / total : 0;
}

export function calculateOperationalTrust(input: TrustSignalInput) {
  const fulfillment = Math.max(0, 15 - Math.round(ratio(input.cancellations, input.orders) * 40));
  const refund = Math.max(0, 15 - Math.round(ratio(input.refunds, input.orders) * 45));
  const dispute = Math.max(0, 15 - Math.min(15, input.disputes * 5));
  const delivery = Math.max(0, 15 - Math.round(ratio(input.failedDeliveries, input.orders) * 35));
  const moderation = Math.max(0, 15 - Math.min(15, input.openFlags * 4 + input.activeEnforcements * 6));
  const kyc =
    input.verificationState === "VERIFIED"
      ? 10
      : input.verificationState === "PENDING_REVIEW" || input.verificationState === "UNDER_REVIEW"
        ? 6
        : input.verificationState === "RESUBMISSION_REQUIRED"
          ? 3
          : input.verificationState === "ESCALATION_REQUIRED"
            ? 2
            : 0;
  const finance = Math.max(0, 15 - Math.min(15, input.failedPayouts * 8));
  const score = boundedScore(fulfillment + refund + dispute + delivery + moderation + kyc + finance);

  return {
    score,
    level: trustLevelForScore(score),
    factors: [
      { label: "Fulfillment reliability", score: fulfillment, detail: `${input.cancellations} cancellations across ${input.orders} orders` },
      { label: "Refund pattern", score: refund, detail: `${input.refunds} refund workflows detected` },
      { label: "Dispute history", score: dispute, detail: `${input.disputes} open disputes` },
      { label: "Delivery consistency", score: delivery, detail: `${input.failedDeliveries} failed deliveries` },
      { label: "Moderation history", score: moderation, detail: `${input.openFlags} open flags and ${input.activeEnforcements} active enforcement actions` },
      { label: "KYC verification", score: kyc, detail: input.verificationState },
      { label: "Financial trust", score: finance, detail: `${input.failedPayouts} failed payout batches` },
    ],
  };
}

export function detectRiskSignals(input: TrustSignalInput): RiskSignal[] {
  const signals: RiskSignal[] = [];

  if (input.orders >= 5 && ratio(input.refunds, input.orders) >= 0.3) {
    signals.push({
      type: "REFUND_ABUSE",
      score: boundedScore(40 + input.refunds * 5),
      severity: "high",
      explanation: "Refund volume is materially above the expected operating baseline.",
    });
  }

  if (input.orders >= 5 && ratio(input.cancellations, input.orders) >= 0.25) {
    signals.push({
      type: "CANCELLATION_SPIKE",
      score: boundedScore(35 + input.cancellations * 5),
      severity: "medium",
      explanation: "Seller cancellations are above the operating threshold.",
    });
  }

  if (input.failedDeliveries >= 3) {
    signals.push({
      type: "DELIVERY_FAILURE_SPIKE",
      score: boundedScore(40 + input.failedDeliveries * 7),
      severity: "high",
      explanation: "Delivery failures are clustering for this seller.",
    });
  }

  if (input.failedPayouts > 0) {
    signals.push({
      type: "PAYOUT_ABUSE",
      score: boundedScore(50 + input.failedPayouts * 10),
      severity: "critical",
      explanation: "Payout failures or mismatches require trust review before repeated release attempts.",
    });
  }

  if (input.verificationState !== "VERIFIED" && input.orders > 0) {
    signals.push({
      type: "KYC_INCOMPLETE",
      score: input.verificationState === "SUSPENDED" ? 90 : 45,
      severity: input.verificationState === "SUSPENDED" ? "critical" : "medium",
      explanation: "Seller has active commerce activity without complete verification.",
    });
  }

  if ((input.suspiciousOrderBursts ?? 0) >= 3) {
    signals.push({
      type: "ORDER_BURST",
      score: boundedScore(35 + (input.suspiciousOrderBursts ?? 0) * 10),
      severity: (input.suspiciousOrderBursts ?? 0) >= 6 ? "high" : "medium",
      explanation: "Order velocity changed abruptly and should be reviewed before fulfillment or payout restrictions.",
    });
  }

  if ((input.reviewAnomalies ?? 0) >= 2) {
    signals.push({
      type: "REVIEW_MANIPULATION",
      score: boundedScore(30 + (input.reviewAnomalies ?? 0) * 12),
      severity: (input.reviewAnomalies ?? 0) >= 5 ? "high" : "medium",
      explanation: "Review pattern anomalies require human verification before trust impact.",
    });
  }

  return signals;
}

export function recommendedEnforcement(signal: RiskSignal): GovernanceEnforcementType {
  if (signal.type === "PAYOUT_ABUSE") return "PAYOUT_HOLD";
  if (signal.type === "KYC_INCOMPLETE" && signal.severity === "critical") return "VERIFICATION_REQUIRED";
  if (signal.type === "CANCELLATION_SPIKE") return "SELLER_THROTTLE";
  if (signal.severity === "critical") return "MANUAL_REVIEW";
  return "WARNING";
}

export function isReversibleEnforcement(type: GovernanceEnforcementType) {
  return type !== "MANUAL_REVIEW";
}

export function governancePressure(input: {
  openCases: number;
  overdueCases: number;
  openDisputes: number;
  overdueDisputes: number;
  highRiskSignals: number;
  activeEnforcements: number;
  recoveryBacklog: number;
}) {
  const pressure =
    input.openCases +
    input.openDisputes +
    input.recoveryBacklog +
    input.highRiskSignals * 2 +
    input.activeEnforcements * 2 +
    input.overdueCases * 3 +
    input.overdueDisputes * 3;
  return {
    pressure,
    alertLevel: pressure >= 80 ? "critical" : pressure >= 35 ? "watch" : "healthy",
    shouldThrottleEnforcement: input.overdueCases + input.overdueDisputes > 10 || input.recoveryBacklog > 50,
    explanation:
      pressure >= 80
        ? "Governance queues are saturated; prioritize recovery and review assignment before broad enforcement."
        : pressure >= 35
          ? "Governance pressure is elevated and should be paced with escalation queues."
          : "Governance pressure is within operational guardrails.",
  } as const;
}
