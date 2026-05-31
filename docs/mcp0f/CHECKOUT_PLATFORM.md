# MCP-0F.3 — Checkout Platform

**Engine:** `lib/commerce-transaction/checkout.ts` + `coupons.ts` ·
**Surfaces:** `/checkout` (real atomic RPC) + `CartCheckoutPanel`.

Benchmarked against Amazon/Flipkart checkout structure: address → delivery →
payment → review.

## Capabilities
- **Address selection + validation** — `validateAddress` (recipient, phone,
  line, city, pincode).
- **Delivery selection + slot selection** — `DELIVERY_OPTIONS`
  (express/standard/slotted) + `deliverySlots` (deterministic windows with
  availability).
- **Coupon application** — `evaluateCouponCode` / `applyCoupon` (percent/flat/
  bundle, min-order, expiry, per-seller, max-discount cap).
- **Tax calculation** — `computeTax` (GST 18% default, CGST/SGST split).
- **Fee calculation** — delivery fee, free over ₹499.
- **Order summary** — `buildCheckoutQuote` → subtotal, discount, tax, delivery, total.
- **Risk + trust validation** — `checkoutRiskScore` (value/method/new-buyer/
  new-address) feeds `buildCheckoutReview.trustOk`.
- **Checkout review** — `buildCheckoutReview` returns `{ ready, blockers,
  warnings, riskScore, trustOk, codEligible, quote }`; gates payment.

Order creation downstream reuses the real `atomic_checkout` RPC (no partial
inventory/payment commits).
