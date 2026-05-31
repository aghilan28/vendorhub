# MCP-0F.1 — Transaction Reality Audit

> Per-stage classification of the commerce loop, from code. Legend:
> **Real** (works end-to-end on live data) · **Partial** (works but incomplete)
> · **Broken** (present but non-functional) · **Placeholder** (visible stub) ·
> **Missing** (absent).

## Stage-by-stage

| # | Stage | Classification | Evidence | Gap closed by MCP-0F |
|---|---|---|---|---|
| 1 | **Cart** | Partial | `lib/actions/cart.ts` (RPC `upsert/remove/clear_live_cart_item`), `lib/api/queries/cart.ts`, `store/cart-store.ts` (client). | Unified cart engine: validation (inventory/price/promotion), save-for-later, multi-seller grouping. |
| 2 | **Checkout** | Partial | `lib/transactions/atomic-checkout.ts` (RPC `atomic_checkout`), `features/checkout/components/transactional-checkout.tsx`. | Address book, delivery slots, coupon, tax/fee breakdown, risk/trust gate, checkout review. |
| 3 | **Payment** | Real | `lib/payments/orchestration.ts`, `app/api/payments/razorpay/*`. Razorpay order/verify/webhook + refund + accounting reconciliation. | Method catalog, retry/recovery, payment analytics + governance posture (engine layer over the real provider). |
| 4 | **Order creation** | Real | RPC `atomic_checkout` creates `orders` + `order_items` + `payment_attempts` atomically. | 12-state lifecycle model wrapping the created order. |
| 5 | **Inventory reservation** | Real | RPC `atomic_checkout` reserves; `release_expired_inventory_reservations` releases. | Reservation health surfaced in cart/checkout validation. |
| 6 | **Shipment creation** | Partial | `app/api/logistics/dispatch/route.ts`, RPC `run_live_dispatch_intelligence`. | Fulfillment task model (accept→pack→dispatch) + shipment record in engine. |
| 7 | **Tracking** | Partial | `/tracking/[id]` reads **sample** `buyerOrders`; `features/logistics/components/buyer-tracking-experience.tsx`. | Tracking engine: events, ETA, delay alerts, delivery confidence, history. |
| 8 | **Delivery** | Partial | Logistics RPCs (`run_dynamic_delivery_sla_enforcement`, `analyze_delivery_congestion`). | Delivery confidence + performance (buyer + seller views). |
| 9 | **Review triggering** | Partial | MCP-0D reviews (`lib/trust/*`, `reviews` table). Not triggered from delivery. | Post-purchase review prompt on `DELIVERED/COMPLETED`. |
| 10 | **Return triggering** | Partial | `ReturnInput`/`ReturnState` (MCP-0D); `return_requests` table (migration, not executed). | Buyer return request flow + eligibility + resolution tracking. |
| 11 | **Refund triggering** | Real | `requestAndInitiateRefund` (RPC `request_order_refund` + Razorpay refund + `post_refund_financial_adjustment`). | Refund status timeline surfaced in Order Center; refund risk intelligence. |

## Summary scores (0–10, evidence-based)

| Capability | Score | Note |
|---|---|---|
| Payment rail | 8 | Live Razorpay + reconciliation; env-gated. |
| Atomic order creation | 8 | Real RPC, no partial commits. |
| Cart completeness | 4 | Two carts, no validation/save-for-later/multi-seller. |
| Checkout completeness | 4 | No address book / coupon / slots / review. |
| Order lifecycle | 5 | 9 states; missing draft/placed/completed/returned/disputed. |
| Fulfillment (seller) | 3 | Status PATCH only; no command center. |
| Delivery tracking (buyer) | 3 | Sample-driven; no tracking engine. |
| Post-purchase | 4 | Refund real; review/return/support not unified. |
| Transaction intelligence | 2 | 0E does not see checkout/payment/delivery/return risk. |
| Buyer order center | 4 | List only. |
| Admin commerce governance | 2 | No center; placeholder remains. |

**Weighted ≈ 4.3/10** — a real payment/checkout *core* exists but the marketplace
cannot yet take a purchase from discovery to completion with operable cart,
fulfillment, tracking, post-purchase, intelligence and governance. MCP-0F closes
exactly these gaps, reusing the real RPC core.

## Method

Static inspection of `lib/transactions`, `lib/payments`, `lib/logistics`,
`lib/actions`, `app/api/{payments,logistics,seller,invoices}`,
`features/{checkout,transactions,orders,marketplace,logistics}` and
`types/index.ts`. Items requiring a configured Supabase/Razorpay are labelled
env-gated (verify-live), never fabricated.
