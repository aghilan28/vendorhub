# MCP-0F — Baseline Audit (evidence-based, from code)

> Context recovery for the Commerce Transaction Engine phase. Every claim below
> is grounded in a file path verified on `feat/mcp0e-intelligence-activation`
> (commit `99056d9`). Prior reports were **not** trusted; the repository is the
> source of truth.

## 0. Starting state (verified by execution)

| Gate | Command | Result |
|---|---|---|
| Typecheck | `tsc --noEmit` | ✅ 0 errors |
| Unit + integration tests | `vitest run tests/unit tests/integration` | ✅ **321 passed / 42 files** |

The chain to date: M8 → N → O → audit → MCP-0A (media) → 0B (catalog) → 0C
(seller OS) → 0D (trust) → 0E (live intelligence). MCP-0F builds **transactions**.

## 1. What already exists and is REAL (reuse, do not rebuild)

### Checkout (atomic, server-side)
- `lib/transactions/atomic-checkout.ts` — `atomicCheckoutAction` calls the
  Postgres RPC `atomic_checkout` (idempotency key, delivery address, payment
  method) → returns `{ transactionId, state, orderIds, orderNumbers, payment }`.
  No partial inventory/payment commits. `releaseExpiredReservationsAction` calls
  `release_expired_inventory_reservations`.
- Tables referenced: `checkout_transactions`, `payment_attempts`, `orders`,
  `order_items`, `order_status_history`, `notifications`, `refund_requests`.

### Payment (live Razorpay)
- `lib/payments/orchestration.ts` — `createLiveRazorpayOrder` (RPC
  `register_live_razorpay_order`), `recordServerPaymentVerification` (RPC
  `record_payment_signature_verification`), `requestAndInitiateRefund` (RPC
  `request_order_refund` + `post_refund_financial_adjustment`).
- Routes: `app/api/payments/razorpay/{order,verify,webhook}/route.ts`,
  `app/api/payments/reconciliation/route.ts`, `app/api/payments/refunds/route.ts`.
- Signature verification + accounting reconciliation are real
  (`features/commerce-finance/razorpay`, `lib/transactions/payment-reconciliation`).
- Payment methods enum: `upi | cod | card | netbanking | wallet`
  (`AtomicCheckoutSchema`, `PaymentTransaction` in `types/index.ts`).

### Orders + lifecycle
- `lib/actions/orders.ts` — `updateOrderStatusAction` guards transitions with
  `canTransitionOrder` (`features/transactions/lifecycle.ts`), writes
  `order_status_history` + buyer/seller `notifications`.
- `features/transactions/lifecycle.ts` — **9-state** machine
  (`PENDING, CONFIRMED, PROCESSING, PACKED, SHIPPED, OUT_FOR_DELIVERY,
  DELIVERED, CANCELLED, REFUNDED`) with `orderTransitions` map +
  `transitionOrder()` (audited, in-memory).
- Queries: `lib/api/queries/orders.ts` (`listBuyerOrders`, `listVendorOrders`).
- Seller status route: `app/api/seller/orders/[orderId]/status/route.ts`.

### Logistics / delivery
- `lib/logistics/live-operations.ts` — RPC wrappers
  (`run_live_dispatch_intelligence`, `run_logistics_provider_failover`,
  `refresh_logistics_routing_intelligence`, `run_dynamic_delivery_sla_enforcement`,
  `analyze_delivery_congestion`).
- Routes: `app/api/logistics/{deliveries,dispatch,reconciliation,health}/route.ts`.

### Invoices / finance
- `app/api/invoices/[orderId]/route.ts`; `GstInvoice`, `SettlementBreakdown`
  types in `types/index.ts`; GST via `features/commerce-finance/gst`.

### Intelligence (MCP-0E) + Trust (MCP-0D) — integration targets
- `lib/marketplace-intelligence/*` — `buildMarketplaceIntelligence`,
  `IntelligenceRecommendation`, and `activation.ts`
  (`activateToExecution/Governance/Simulation`).
- `lib/trust/types.ts` — `ReturnInput`, `RefundInput`, `ReviewInput`,
  `DisputeInput`, `SupportTicketInput`, state machines (`ReturnState`,
  `RefundState`, `DisputeState`).

## 2. What is PARTIAL / PLACEHOLDER / MISSING (the MCP-0F frontier)

| Area | Finding | Classification |
|---|---|---|
| **Cart** | Two carts: server live cart (RPC `upsert_live_cart_item` etc., `lib/actions/cart.ts`) **and** a client `useCartStore`. No save-for-later, no multi-seller grouping, no cart-level inventory/price/promotion validation surface. | Partial |
| **Address book** | `transactional-checkout.tsx` reads client `useCheckoutStore` addresses and states plainly that real addresses arrive "once onboarding and live account data are connected". No `addresses` table / persistence. | Missing |
| **Coupons** | `calculateOrderPricing` applies only a hard-coded `discount = 50 if subtotal>=799`. No coupon/promotion application at checkout (seller promotions exist in 0C but are not redeemable by buyers). | Missing |
| **Delivery slots** | Hard-coded `<option>` list in the checkout form. No slot engine. | Placeholder |
| **Order lifecycle** | 9 states only. Missing `DRAFT, PLACED, COMPLETED, RETURNED, DISPUTED` required by the directive; no unified transaction-level state machine. | Partial |
| **Fulfillment (seller)** | Seller can PATCH order status, but there is no Fulfillment Command Center (accept/pack/dispatch/track/resolve + SLA + courier health). | Missing |
| **Delivery tracking (buyer)** | `/tracking/[id]` resolves from the **sample** `buyerOrders` (`features/marketplace/lib/data`), not a tracking engine (ETA, delay alerts, delivery confidence, history). | Partial |
| **Post-purchase** | Refund request action exists; no unified buyer flow for review + return + refund + support + resolution tracking integrated with MCP-0D. | Partial |
| **Transaction intelligence** | MCP-0E operates on demand/inventory/pricing/trust but **not** on checkout-drop / payment / delivery / return / refund / operational transaction risk. | Missing |
| **Buyer Order Center** | `/orders` lists orders only; no unified My Orders / Tracking / Invoices / Returns / Refunds / Support / Reviews / Reorder / Analytics center. | Partial |
| **Admin Commerce Governance** | No `/admin/commerce` center for orders/payments/refunds/deliveries/disputes/failures/throughput; `admin/platform-health-placeholder` remains. | Missing |

## 3. MCP-0F plan (reuse-first)

Build a **deterministic transaction engine** `lib/commerce-transaction/` that
operates on the **same real shapes** (`@/features/seller/types`,
`@/lib/trust/types`, `types/index.ts`) so it runs identically on live and
labelled-sample data, then realise the surfaces:

1. `types.ts` — transaction domain (12-state lifecycle, cart, checkout quote,
   payment plan, fulfillment task, shipment tracking, post-purchase request,
   transaction risk).
2. `state-machine.ts` — the **12-state** order lifecycle (superset of the live
   9-state machine; maps to DB statuses), guarded transitions, audited events.
3. `cart.ts` — add/remove/update/save-for-later/wishlist/move, multi-seller
   grouping, inventory/price/promotion validation.
4. `coupons.ts` — percent/flat/bundle coupon application (min order, expiry,
   per-seller, stackable rules).
5. `checkout.ts` — address validation, delivery options + slots, coupon, GST tax,
   fees, order summary, risk/trust gate, checkout review.
6. `payment.ts` — method catalog, payment plan, retry/recovery, reconciliation
   status, payment analytics, governance posture.
7. `fulfillment.ts` — seller accept/pack/dispatch/track/resolve, SLA, courier
   health; admin monitor/escalate/audit.
8. `tracking.ts` — shipment, tracking events, ETA, delay alerts, delivery
   confidence, history; seller fulfillment/courier/delivery performance.
9. `post-purchase.ts` — review/return/refund/support flows + resolution tracking
   (MCP-0D shapes).
10. `intelligence.ts` — checkout-drop / fulfillment / payment / delivery / return
    / refund / operational risks + ranked actions; bridges to the MCP-0E
    `IntelligenceRecommendation` shape.
11. `queries.ts` — degrade-safe live reads (typed, not executed without Supabase;
    `sampled: true` fallback).
12. `sample.ts` + `index.ts` — deterministic sample + assembler
    `buildTransactionSnapshot`.

Surfaces: enhanced buyer **Order Center** + **Checkout** + **Tracking**, seller
**Fulfillment Command Center** (`/seller/fulfillment`), admin **Commerce
Governance Center** (`/admin/commerce`). Migrations for `buyer_addresses` and
`marketplace_coupons` provided (not executed — no live DB here).

## 4. Honest scope

- No live DB in the sandbox: live reads in `queries.ts` are typed but execute
  only against a configured Supabase; surfaces show a labelled sample
  (`sampled: true`) otherwise — never demo data inside a "live" result.
- The real `atomic_checkout` / Razorpay / refund RPCs are **reused** unchanged;
  MCP-0F adds the deterministic engine, validation, lifecycle completion,
  intelligence and the operator/buyer surfaces on top.
