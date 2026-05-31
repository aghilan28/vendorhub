# ORDER PIPELINE AUDIT (Section 10)

| Stage | State | Evidence |
|-------|-------|----------|
| Cart | ✅ | RPCs `upsert_live_cart_item`, `remove_live_cart_item`, `clear_live_cart` (`lib/actions/cart.ts`); read `listLiveCartItems` |
| Checkout | ✅ | `checkout_transactions` + `payment_attempts`; atomic transaction engine (Phase 17 migration) |
| Payment | ✅ | Real Razorpay: `createLiveRazorpayOrder`, signature verify, webhook route, RPC `register_live_razorpay_order` |
| Order creation | ✅ | `createOrderAction` inserts `orders` (`lib/actions/orders.ts`) |
| Order tracking | 🟡 | `order_status_history` + logistics ETA; live carrier (Shiprocket) env present, integration partial |
| Status updates | ✅ | `updateOrderStatusAction` → status history + notifications |
| Cancellation | 🟡 | status transitions exist; explicit buyer-cancel UI thin |
| Returns | 🟡 | refund RPC `request_order_refund`; buyer-initiated return UI not found |
| Refunds | ✅ | `requestAndInitiateRefund` → Razorpay refund + accounting RPC `post_refund_financial_adjustment` |
| Notifications | 🟡 | order notifications inserted; web push infra real; email/SMS unclear |
| Shipping/fulfillment | 🟡 | logistics dispatch + ETA; Shiprocket creds in env, integration partial |

## Brutal summary
- **Strengths:** this is a **real, reconciled financial order pipeline** —
  cart → checkout transaction → Razorpay → order → status history → refund with
  double-entry-style accounting adjustments. Above typical MVP.
- **Weaknesses:** buyer-facing **cancellation/returns UI thin**, carrier
  integration (Shiprocket) partial, notification channels beyond web-push unclear.
- **Caveat:** env-gated; needs Supabase + Razorpay keys to function.

**Orders score: 6/10.**
