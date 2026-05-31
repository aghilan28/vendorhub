// MCP-0F.4 — Payment Platform engine (deterministic, pure).
//
// A governance/analytics layer OVER the repo's real Razorpay rail
// (lib/payments/orchestration.ts). It owns the method catalog, the per-method
// payment plan, retry/recovery logic, reconciliation status and payment
// analytics — operating on real PaymentAttemptRecord events.

import type {
  PaymentAnalytics,
  PaymentAttemptRecord,
  PaymentMethod,
  PaymentMethodConfig,
  PaymentPlan,
  PaymentRetryDecision,
  PaymentState,
  PaymentStep,
} from "./types";

export const PAYMENT_METHODS: Record<PaymentMethod, PaymentMethodConfig> = {
  upi: { method: "upi", label: "UPI", instant: true, requiresGatewayOrder: true, requiresSignatureVerification: true, maxAmount: 100_000, retryable: true },
  card: { method: "card", label: "Card", instant: true, requiresGatewayOrder: true, requiresSignatureVerification: true, maxAmount: 0, retryable: true },
  netbanking: { method: "netbanking", label: "Net Banking", instant: true, requiresGatewayOrder: true, requiresSignatureVerification: true, maxAmount: 0, retryable: true },
  wallet: { method: "wallet", label: "Wallet", instant: true, requiresGatewayOrder: true, requiresSignatureVerification: true, maxAmount: 100_000, retryable: true },
  cod: { method: "cod", label: "Cash on Delivery", instant: false, requiresGatewayOrder: false, requiresSignatureVerification: false, maxAmount: 50_000, retryable: false },
};

export function paymentMethodConfig(method: PaymentMethod): PaymentMethodConfig {
  return PAYMENT_METHODS[method];
}

const MAX_ATTEMPTS = 3;

const SUCCESS_STATES: PaymentState[] = ["succeeded", "cod_confirmed"];
const FAILURE_STATES: PaymentState[] = ["failed", "cancelled"];
const PENDING_STATES: PaymentState[] = ["not_started", "intent_created", "pending", "processing", "cod_pending", "refund_pending"];

export function isPaymentSettled(state: PaymentState): boolean {
  return SUCCESS_STATES.includes(state);
}
export function isPaymentFailed(state: PaymentState): boolean {
  return FAILURE_STATES.includes(state);
}
export function isPaymentPending(state: PaymentState): boolean {
  return PENDING_STATES.includes(state);
}

// ── Payment plan ──────────────────────────────────────────────────────────────

export function buildPaymentPlan(amount: number, method: PaymentMethod, codAllowed: boolean): PaymentPlan {
  const config = paymentMethodConfig(method);
  const blockers: string[] = [];

  if (amount <= 0) blockers.push("Order amount is invalid.");
  if (config.maxAmount > 0 && amount > config.maxAmount) {
    blockers.push(`${config.label} supports up to ₹${config.maxAmount.toLocaleString("en-IN")}.`);
  }
  if (method === "cod" && !codAllowed) blockers.push("Cash on Delivery is unavailable for this order.");

  const steps: PaymentStep[] =
    method === "cod"
      ? [
          { key: "place", label: "Place order", done: false },
          { key: "confirm", label: "Confirm COD at delivery", done: false },
        ]
      : [
          { key: "order", label: "Create gateway order", done: false },
          { key: "pay", label: "Authorise payment", done: false },
          { key: "verify", label: "Verify signature", done: false },
          { key: "capture", label: "Webhook capture & reconcile", done: false },
        ];

  return {
    method,
    amount,
    currency: "INR",
    requiresGatewayOrder: config.requiresGatewayOrder,
    codEligible: method === "cod" ? codAllowed : true,
    steps,
    blockers,
  };
}

// ── Retry / recovery ──────────────────────────────────────────────────────────

export function planPaymentRetry(attempt: PaymentAttemptRecord): PaymentRetryDecision {
  const config = paymentMethodConfig(attempt.method);
  const attemptsRemaining = Math.max(0, MAX_ATTEMPTS - attempt.attempts);

  if (isPaymentSettled(attempt.state)) {
    return { retryable: false, recommendedMethod: attempt.method, reason: "Payment already succeeded.", attemptsRemaining };
  }
  if (!isPaymentFailed(attempt.state)) {
    return { retryable: false, recommendedMethod: attempt.method, reason: "Payment is still in progress.", attemptsRemaining };
  }
  if (!config.retryable) {
    return { retryable: false, recommendedMethod: "upi", reason: "This method cannot be retried; switch to UPI.", attemptsRemaining };
  }
  if (attemptsRemaining <= 0) {
    return { retryable: false, recommendedMethod: "cod", reason: "Retry limit reached; offer COD or a different method.", attemptsRemaining };
  }
  // Recovery heuristic: a failed card/netbanking is most reliably recovered via UPI.
  const recommendedMethod: PaymentMethod = attempt.method === "card" || attempt.method === "netbanking" ? "upi" : attempt.method;
  return {
    retryable: true,
    recommendedMethod,
    reason: `Payment failed${attempt.failureReason ? ` (${attempt.failureReason})` : ""}. Retry is safe and idempotent.`,
    attemptsRemaining,
  };
}

/** Whether an attempt needs reconciliation (pending past a freshness window). */
export function needsReconciliation(attempt: PaymentAttemptRecord, now?: string, staleMinutes = 30): boolean {
  if (!isPaymentPending(attempt.state)) return false;
  const ageMs = new Date(now ?? new Date().toISOString()).getTime() - new Date(attempt.updatedAt).getTime();
  return ageMs > staleMinutes * 60 * 1000;
}

// ── Analytics ──────────────────────────────────────────────────────────────────

export function buildPaymentAnalytics(attempts: PaymentAttemptRecord[]): PaymentAnalytics {
  const total = attempts.length;
  const succeeded = attempts.filter((a) => isPaymentSettled(a.state)).length;
  const failed = attempts.filter((a) => isPaymentFailed(a.state)).length;
  const pending = attempts.filter((a) => isPaymentPending(a.state)).length;
  const retried = attempts.filter((a) => a.attempts > 1).length;
  const cod = attempts.filter((a) => a.method === "cod").length;
  const recoverableValue = attempts.filter((a) => isPaymentFailed(a.state)).reduce((sum, a) => sum + a.amount, 0);

  const methods: PaymentMethod[] = ["upi", "card", "netbanking", "wallet", "cod"];
  const methodMix = methods
    .map((method) => {
      const count = attempts.filter((a) => a.method === method).length;
      return { method, count, share: total ? Math.round((count / total) * 100) : 0 };
    })
    .filter((m) => m.count > 0);

  return {
    total,
    succeeded,
    failed,
    pending,
    successRate: total ? Math.round((succeeded / total) * 100) : 0,
    failureRate: total ? Math.round((failed / total) * 100) : 0,
    retryRate: total ? Math.round((retried / total) * 100) : 0,
    codShare: total ? Math.round((cod / total) * 100) : 0,
    methodMix,
    recoverableValue,
  };
}

/** Governance signals derived from payment analytics. */
export function paymentGovernanceSignals(analytics: PaymentAnalytics): string[] {
  const signals: string[] = [];
  if (analytics.total === 0) return signals;
  if (analytics.failureRate >= 25) signals.push(`High payment failure rate (${analytics.failureRate}%) — review gateway health and offer retry/UPI.`);
  if (analytics.pending > 0 && analytics.pending >= Math.ceil(analytics.total * 0.15)) signals.push(`${analytics.pending} payments pending reconciliation.`);
  if (analytics.codShare >= 60) signals.push(`COD share is high (${analytics.codShare}%) — RTO and cash-handling risk.`);
  if (analytics.recoverableValue > 0) signals.push(`₹${analytics.recoverableValue.toLocaleString("en-IN")} in failed payments is recoverable via retry.`);
  return signals;
}
