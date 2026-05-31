# EC-6 Phase 3 — Dispute Management Certification

**Source:** `lib/marketplace-operations/disputes.ts`, `/disputes`, `/admin/operations` (Disputes tab).

| Aspect | Status | Evidence |
|--------|--------|----------|
| Buyer disputes | ✅ REAL | `createDispute({type, buyerId, sellerId, orderId, amount, description})` |
| Seller disputes | ✅ REAL | dispute carries `sellerId`; seller evidence via `submitEvidence(role: seller)` |
| Payment disputes | ✅ REAL | dispute type `payment_dispute` |
| Refund disputes | ✅ REAL | dispute type `refund_disagreement`; resolution `refundAmount` |
| Return disputes | ✅ REAL | `delivery_dispute` / `item_not_as_described` types + EC-2 returns linkage |
| Escalations | ✅ REAL | `escalated` state (tested in operator journey) |
| Dispute workflows | ✅ REAL | 10-state machine (`filed → evidence_collection → under_review → mediation → escalated → resolved_* → closed`), guarded |
| Dispute resolution | ✅ REAL | `resolveDispute({outcome, summary, refundAmount, resolvedBy})` → resolved_buyer/seller/platform |
| Audit trails | ✅ REAL | `timeline[]` event log per dispute (≥4 events in escalation journey) |

## Executed evidence (`ec6-operations-scale.test.ts`)
Operator journey: create → submit evidence → evidence_collection → under_review → escalated → resolve (buyer_wins, ₹2000); timeline ≥ 4 events. Analytics over 100/1,000 disputes (`computeDisputeAnalytics`).

**Status: PASS.**
