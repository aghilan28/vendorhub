# MCP-0D.7 — Refund Management Platform

Engine: `lib/trust/lifecycles.ts` (refund state machine). Reuses the existing
real refund pipeline (`refund_requests` + Razorpay refund RPCs from the
marketplace core).

## Lifecycle
`requested → approved | rejected`; `approved → processing`;
`processing → refunded | failed`; `failed → processing` (retry). Enforced by
`canTransitionRefund` / `transitionRefund`.

## Roles
- **Buyer**: request refund, track, receive (to original payment method).
- **Seller**: approve / reject / resolve.
- **Admin**: audit / override / resolve (Trust Governance Center; existing
  reconciliation RPCs post financial adjustments).

Open refunds surfaced in the Admin Trust Center (real count via
`getTrustGovernanceCounts`). Verified by tests (transition legality).
