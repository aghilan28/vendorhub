# EC-2 Phase 4 — Refund Certification

**Module:** `lib/commerce-core/refunds.ts` · Tables: `commerce_refunds`, `store_credit_ledger` · Reuses real Razorpay rail (`lib/payments/orchestration.ts`) + MCP-1E governance (`refund-governance.ts`).

## Delivered
- **Modes:** `full`, `partial`, `wallet`, `store_credit` — `resolveRefundAmount` validates partial bounds (>0, ≤ order total).
- **Lifecycle:** `INITIATED → PROCESSING → COMPLETED/FAILED`, `FAILED → INITIATED` (retry). `canTransitionRefund` guards.
- **Gateway vs internal:** full/partial carry `gatewayReference` (Razorpay); wallet/store_credit set `walletCredited` on completion.
- **Store-credit ledger:** `creditStoreCredit` (monotonic balance), `storeCreditBalance`, `store_credit_ledger` table with per-customer RLS.
- **Audit trail:** every state change appends an `AuditEntry`.
- **Reporting:** `refundAnalytics` (total/completed/failed/totalRefunded/byMode).
- **Persistence:** `commerce_refunds` (`ec2_refund_mode` enum) with customer/admin RLS.

## Mandated capabilities: ✅ Full / Partial / Wallet / Store-credit · tracking · audit trail · reporting · intelligence (risk scoring reused from MCP-1E `refund-governance`).

## Tests: 6 refund tests (amount resolution, full gateway lifecycle, wallet/store-credit, failure+retry, store-credit ledger, analytics).

**Status: COMPLETE.**
