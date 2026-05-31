# MCP-0F.8 — Post-Purchase Platform

**Engine:** `lib/commerce-transaction/post-purchase.ts` — built on the **MCP-0D**
trust shapes (`ReturnInput`, `RefundInput`, `ReviewInput`, `SupportTicketInput`,
`DisputeInput`) so it reuses the trust layer rather than duplicating it.
**Surface:** Order Center (Returns & Refunds, Reviews tabs).

## Capabilities
- **Review product / seller** — `canReview` (only on `delivered`/`completed`);
  reviews feed MCP-0D.
- **Request return** — `returnEligibility` (7-day window from the delivered
  event) → `ReturnEligibility { eligible, daysRemaining, reason }`.
- **Request refund** — runs on the **real** `requestAndInitiateRefund` (Razorpay
  + accounting adjustment).
- **Request support** — `SupportTicketInput` flows (MCP-0D support routing).
- **Track resolution** — `returnResolutionSteps` (requested→approved→in_transit→
  received→resolved) and `refundResolutionSteps` (requested→approved→processing→
  refunded), with rejected/failed/cancelled branches.

## Summary
`buildPostPurchaseSummary` → reviewable, openReturns, resolvedReturns,
openRefunds, refundedValue, openTickets, openDisputes — surfaced to buyer and
admin.
