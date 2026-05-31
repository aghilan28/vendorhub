# MCP-0F.12 — User Journey Report

All six mandated journeys function on the deterministic engine (live data when
Supabase is configured, labelled sample otherwise). Each step cites the engine
function or surface that realises it.

## Journey A — Buyer: Add → Checkout → Pay → Order created
1. **Add** — `addItem` / `validateCart` (cart engine); surface `/cart` →
   `CartCheckoutPanel` (multi-seller grouping, inventory/price validation).
2. **Checkout** — `buildCheckoutQuote` + `buildCheckoutReview` (address +
   delivery + coupon + GST + risk gate); surface `/checkout`.
3. **Pay** — `buildPaymentPlan` over the **real** Razorpay rail
   (`lib/payments/orchestration.ts`, `/api/payments/razorpay/*`).
4. **Order created** — the existing **atomic** `atomic_checkout` RPC creates the
   order + reserves inventory with no partial commits; the order enters the
   12-state lifecycle at `placed`.

## Journey B — Seller: Accept → Pack → Ship
- `/seller/fulfillment` (Fulfillment Command Center) → queue from
  `buildFulfillmentQueue`. `sellerNextStates`/`fulfillmentActions` expose the
  legal forward actions; `applyTransition` guards `placed→confirmed→packed→
  shipped`. Commits reuse the real `updateOrderStatusAction` (history +
  notifications).

## Journey C — Buyer: Track → Receive → Review
- **Track** — `/orders` (Order Center) → Tracking tab → `buildTrackingView`
  (stage, ETA, delay, delivery confidence, history). `/tracking/[id]` for detail.
- **Receive** — lifecycle reaches `delivered`/`completed`.
- **Review** — `canReview` gates the review prompt; reviews feed the MCP-0D
  trust layer.

## Journey D — Buyer: Return → Refund
- `returnEligibility` (7-day window from delivery) gates the return; the request
  follows the MCP-0D `ReturnState` machine (`returnResolutionSteps`). Refunds run
  on the **real** `requestAndInitiateRefund` (Razorpay refund +
  `post_refund_financial_adjustment`); status shown via `refundResolutionSteps`
  in the Order Center.

## Journey E — Admin: Detect operational issue → Resolve
- `/admin/commerce` (Commerce Governance Center) → `detectTransactionRisks`
  surfaces SLA breaches / payment failures / delivery delays / disputes; the
  recommended action routes the admin to the breached orders, refund
  reconciliation or dispute resolution.

## Journey F — Intelligence: Detect risk → Trigger action
- `buildTransactionIntelligence` detects risk on real orders/payments/shipments;
  `risksToRecommendations` converts each into an MCP-0E `IntelligenceRecommendation`;
  `activateRecommendations` (the existing 0E connectors) turns them into
  **execution** initiatives, **governance** signals or **simulation** scenarios.
  Exposed at `GET /api/commerce` and the governance center Risks tab.

All journeys are covered by `tests/unit/mcp0f-commerce-transaction.test.ts`
(36 deterministic tests), including the activation of every transaction risk
through the 0E connectors.
