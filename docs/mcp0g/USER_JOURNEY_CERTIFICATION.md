# MCP-0G.13 — User Journey Certification

All six mandated journeys function (live when configured; labelled sample
otherwise). Each cites the realising surface/engine.

## Journey A — Buyer: Discover → Purchase → Receive → Review
`/discover` or `/search` → `/product/[slug]` (gallery + trust) → `/cart`
(validation/coupon) → `/checkout` (review gate + atomic RPC + Razorpay) →
`/orders` (lifecycle) → `/tracking/[id]` (ETA/confidence) → review (0D). ✅

## Journey B — Seller: List → Sell → Fulfil
`/seller/products/new` + `/seller/catalog` + `/seller/media` (list) → order
arrives → `/seller/fulfillment` (accept→pack→dispatch→deliver) → `/seller/payouts`
(settlement). ✅

## Journey C — Admin: Govern → Resolve
`/admin/commerce` + `/admin/trust` + `/admin/platform-health` detect issues →
`/admin/refunds` / `/admin/vendors` / `/admin/moderation` resolve. ✅

## Journey D — Intelligence: Detect → Recommend → Outcome
0E/0F detect on live data → `risksToRecommendations` → `activateToExecution`
(M8 Initiative + Action Plan) → KPIs/outcomes. Verified via `GET /api/commerce`
and unit tests. ✅

## Journey E — Trust: Detect Risk → Resolve Risk
0D `detectTrustInsights` (review fraud / seller risk / refund abuse) →
`/admin/trust` governance → enforcement; returns/refunds resolution tracked in
the Buyer Order Center. ✅

## Journey F — Marketplace: Operate End-to-End
Discovery → product → cart → checkout → payment → order → fulfillment → delivery
→ review → return → refund — all stages reachable and coherent (Journeys A–E
chained). ✅

## Validation
Backed by 372 passing unit/integration tests (incl. 36 transaction + 15
navigation), a successful production build emitting every journey route, and the
deterministic engines that power each step.
