# MCP-0F.4 — Payment Platform

**Engine:** `lib/commerce-transaction/payment.ts` — a governance/analytics layer
**over** the repo's real Razorpay rail (`lib/payments/orchestration.ts`,
`/api/payments/razorpay/{order,verify,webhook}`, `/refunds`, `/reconciliation`).

## Capabilities
- **Method catalog** — `PAYMENT_METHODS` for UPI / Cards / Net Banking / Wallets
  / COD (instant, gateway-order, signature-verification, max-amount, retryable).
- **Payment plan** — `buildPaymentPlan` returns method-specific steps (gateway
  order → authorise → verify → webhook capture; COD → place → confirm) + blockers.
- **Retry / recovery** — `planPaymentRetry`: failed card/netbanking recovers via
  UPI; retry capped at 3; idempotent.
- **Reconciliation** — `needsReconciliation` flags pending attempts past a
  freshness window (feeds the real reconciliation RPC).
- **Analytics** — `buildPaymentAnalytics`: success/failure/retry rates, COD
  share, method mix, recoverable value.
- **Governance** — `paymentGovernanceSignals`: high failure rate, pending
  backlog, COD/RTO risk, recoverable value.

Operates on real `PaymentAttemptRecord` events (mapped from `payment_attempts`).
Final capture remains webhook-reconciled by the existing rail.
