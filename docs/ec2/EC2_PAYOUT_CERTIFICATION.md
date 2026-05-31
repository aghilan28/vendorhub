# EC-2 Phase 2 — Seller Payout Certification

**Module:** `lib/commerce-core/payouts.ts` · Migration: `ec2_commerce_completion` · API: `/api/commerce/payouts`

## Delivered
- **Seller ledger** — `appendLedgerEntry`, `recordSale` (sale + commission entries), monotonic balance.
- **Mandated status lifecycle** — `PENDING → PROCESSING → SETTLED/FAILED`, `SETTLED → REVERSED`, `FAILED → PENDING` (retry). `canTransitionPayout` guards all.
- **Payout records** — `createPayout` (net = gross − commission − refundAdjustments), `transitionPayout` with audit trail + settledAt/failureReason.
- **Earnings dashboard data** — `computeEarnings` → lifetime gross/commission/net, pending, available, settled, payoutsByStatus.
- **Persistence** — `seller_ledger_entries`, `seller_payouts` tables (`ec2_payout_status` enum) with RLS (seller reads own via `current_user_is_vendor_member`; admin manages).
- **APIs** — `GET /api/commerce/payouts` (earnings snapshot, degrade-safe), `POST` (admin RBAC transition).
- **Existing real screen** — `/seller/payouts` (`SellerPayoutsScreen` → `getSellerFinanceSnapshot`) retained; navigation already de-placeholdered by MCP-0G.

## Mandated statuses: ✅ PENDING / PROCESSING / SETTLED / FAILED / REVERSED all implemented & tested.

## Tests: 5 payout tests in `commerce-core.test.ts` (lifecycle legality, net calc, full transition, earnings, ledger monotonicity).

**Status: COMPLETE.**
