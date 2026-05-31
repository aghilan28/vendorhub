# MCP-0F.6 — Fulfillment Platform

**Engine:** `lib/commerce-transaction/fulfillment.ts` · **Surface:**
`/seller/fulfillment` (Fulfillment Command Center) — also feeds `/admin/commerce`.

## Seller
- **Accept / Pack / Dispatch / Track / Resolve** — `buildFulfillmentQueue`
  derives the next action per order (`accept→pack→dispatch→deliver→resolve`);
  `fulfillmentActions`/`sellerNextStates` expose legal forward transitions.
  Commits reuse the real `updateOrderStatusAction`.
- **SLA / breach** — `buildFulfillmentTask` computes age vs `slaMinutes`;
  `breached` and `atRisk` (>75% of SLA) flags; queue sorts breaches first.

## Admin
- **Monitor / Escalate / Audit / Optimize** — `buildFulfillmentHealth` gives a
  0..100 score + tone, open tasks, breaches, at-risk, on-time %, by-state
  distribution and per-courier health (`buildCourierHealth`). Surfaced in the
  Commerce Governance Center.

## Command Center tabs
Queue · Health · Couriers · Delivery performance — all engine-driven, labelled
sample before sign-in.
