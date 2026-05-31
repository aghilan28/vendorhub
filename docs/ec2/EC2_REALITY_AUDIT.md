# EC-2 Reality Audit

**Branch:** `release/v1-commerce-complete` (from `release/v1-candidate`)
**Date:** 2026-05-31
**Method:** Source verification only. Prior reports not trusted.

---

## Commerce Area Classification

| Area | Status | Evidence |
|------|--------|----------|
| Seller Payouts | **PARTIAL** | `features/commerce-finance/payouts.ts` (settlement calc), `payout-orchestration.ts` (79L), `ledger-operating-system.ts` (168L), `settlement-intelligence.ts`, real screen `seller-payouts-screen.tsx` reading `getSellerFinanceSnapshot()`. BUT status taxonomy is `PAYOUT_COMPLETED/FAILED/DISPUTED` — NOT the mandated PENDING/PROCESSING/SETTLED/FAILED/REVERSED. No explicit payout-status lifecycle engine. |
| Returns | **PARTIAL** | `return_requests` table exists (mcp0d, `return_state` enum). `lib/commerce-transaction/post-purchase.ts` has `returnEligibility()`, `returnResolutionSteps()`. BUT no customer-facing return *submission* action/route; no seller review/approve write path. |
| Refunds | **PARTIAL→REAL** | `refund_requests` table; `lib/payments/orchestration.ts` real Razorpay refund; `lib/marketplace-operations/refund-governance.ts` (MCP-1E) risk scoring + auto-approve/block. BUT no full/partial/wallet/store-credit modes; no store-credit ledger. |
| Reviews | **PARTIAL (display only)** | `reviews` table (rating/title/body/verified/moderation). `lib/trust/queries.ts` reads counts; trust components display. **No submission write path** (`createReview`) anywhere. |
| Ratings | **PARTIAL (display only)** | Same as reviews — `rating-display` component reads; no submission. |
| Customer Support | **PARTIAL→REAL** | `lib/marketplace-operations/support.ts` (MCP-1E) full ticket engine; routes `/support`, `/seller/support`. `support_tickets` table exists. BUT engine computes on seed, not DB-persisted; no write action to `support_tickets`. |
| Delivery | **PARTIAL** | `lib/logistics/providers/shiprocket.ts` (104L real API client w/ token caching), `features/logistics/providers.ts` (204L abstraction), `lib/logistics/live-operations.ts`. BUT no unified shipment-create/track/webhook commerce path wired end-to-end. |
| Transactional Email | **MISSING** | Only `lib/push/sender.ts` (web-push). No email provider, no templates, no transactional dispatch. |

---

## Gap Summary

| Priority | Gap | Type |
|----------|-----|------|
| P0 | Review/rating submission write path | MISSING |
| P0 | Transactional email infrastructure | MISSING |
| P0 | Returns submission + seller decision write path | PARTIAL (no write) |
| P0 | Payout status lifecycle (mandated taxonomy) | PARTIAL |
| P1 | Refund modes (full/partial/wallet/store-credit) | PARTIAL |
| P1 | Support ticket DB persistence write path | PARTIAL |
| P1 | Delivery shipment/track/webhook commerce path | PARTIAL |

---

## EC-2 Plan (reuse-first, no new non-commerce systems)

Build `lib/commerce-core/` — deterministic, tested engines that complete the 8 areas, plus server actions (write to existing `reviews`/`return_requests`/`support_tickets` tables), API routes, one migration (`ec2_commerce_completion`: wallet/store-credit ledger, payout ledger statuses, review reports), email provider abstraction + templates, minimal submission UI (reviews, returns), and tests. Degrade-safe throughout (real when Supabase configured, sample otherwise) — identical to the established MCP pattern.

**No new intelligence/catalog/search/hyperlocal/governance/platform systems. Commerce gaps only.**
