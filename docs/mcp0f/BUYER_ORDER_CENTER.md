# MCP-0F.10 — Buyer Order Center

**Surface:** `/orders` → `features/commerce-transaction/components/buyer-order-center.tsx`
(engine-driven via `getBuyerOrderCenterSnapshot`, labelled sample before sign-in).

## Tabs (all mandated capabilities)
- **My Orders** — lifecycle progress bar (`lifecycleProgress` + `STATE_META`),
  buyer-facing status, value; links to **details**, **invoice**
  (`/api/invoices/[orderId]`) and **reorder**.
- **Tracking** — per-shipment `buildTrackingView` (stage, ETA, delay, confidence,
  history).
- **Returns & Refunds** — `returnEligibility` per settled order + refund/return
  counts and refunded value.
- **Reviews** — `canReview`-gated review prompts that feed MCP-0D.
- **Support** — resolution/ticket counts (via post-purchase summary).
- **Order Analytics** — orders, AOV, fulfillment rate, total spend.
- **Reorder** — quick re-add link from any order.

Header stats: orders, in-transit, open returns, total spend.
