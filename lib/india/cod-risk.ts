export function scoreCodRisk(input: {
  codOrders: number;
  codCancellations: number;
  refusedDeliveries: number;
  unreachableAttempts: number;
  orderValue: number;
  trustScore?: number;
}) {
  const cancellationRate = input.codOrders ? input.codCancellations / input.codOrders : 0;
  const valueRisk = input.orderValue > 3000 ? 18 : input.orderValue > 1999 ? 10 : 0;
  const trustPenalty = input.trustScore == null ? 6 : input.trustScore < 40 ? 18 : input.trustScore < 60 ? 8 : 0;
  const score = Math.min(
    100,
    Math.round(cancellationRate * 45) + input.refusedDeliveries * 12 + input.unreachableAttempts * 8 + valueRisk + trustPenalty,
  );

  return {
    score,
    eligible: score < 60,
    cooldownRequired: score >= 75,
    verificationRequired: score >= 35,
    reason:
      score >= 75
        ? "COD cooldown recommended due to repeated collection or delivery risk."
        : score >= 60
          ? "COD should be blocked until recent reliability improves."
          : score >= 35
            ? "COD allowed with OTP or seller confirmation."
            : "COD risk is within operating guardrails.",
  };
}
