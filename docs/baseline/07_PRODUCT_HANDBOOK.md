# Deliverable 7 — Product Handbook

**Section 6 of the directive.** One entry per product surface on the certified branch: Purpose · Target user · Inputs · Outputs · Dependencies · Usage · Limitations.

---

## A. Buyer products

### Marketplace (`/`, `/home`)
- **Purpose:** Hyperlocal discovery feed and entry point.
- **Target user:** Buyer.
- **Inputs:** location/context, category filters, recommendation signals.
- **Outputs:** product grid, recommendations, navigation to detail.
- **Dependencies:** `features/marketplace`, `lib/geo`, recommendation lib.
- **Usage:** land → browse → drill into product.
- **Limitations:** geo discovery API is partial; personalization is heuristic.

### Search (`/search`)
- **Purpose:** Semantic + fallback product search.
- **Target user:** Buyer.
- **Inputs:** query string, filters.
- **Outputs:** ranked results.
- **Dependencies:** `/api/intelligence/search`, `lib/ai`.
- **Usage:** type query → results.
- **Limitations:** quality depends on embeddings pipeline; no image search.

### Product detail (`/products/[id]`, `/product/[slug]`)
- **Purpose:** Product information + buy action.
- **Inputs:** product id/slug.
- **Outputs:** detail, price, ratings, add-to-cart.
- **Dependencies:** catalog, ratings, pricing.
- **Limitations:** dynamic pricing not surfaced (backend-only).

### Cart / Checkout (`/cart`, `/checkout`)
- **Purpose:** Cart management and payment.
- **Inputs:** cart items, address, payment.
- **Outputs:** placed order, Razorpay transaction, invoice.
- **Dependencies:** cart store, `/api/payments/razorpay/*`, `/api/invoices/[orderId]`.
- **Limitations:** requires Razorpay + Supabase env; COD logic exists in `lib/india`.

### Orders / Tracking (`/orders`, `/orders/[id]`, `/tracking/[id]`)
- **Purpose:** Order history and live delivery tracking.
- **Outputs:** order state, delivery timeline.
- **Dependencies:** orders, `lib/logistics`, `/api/logistics/*`.
- **Limitations:** live tracking visualization is partial.

### Wishlist / Profile (`/wishlist`, `/profile`)
- **Purpose:** Saved items and account management.
- **Limitations:** standard CRUD; no cross-device sync claims.

---

## B. Seller products

### Seller dashboard (`/seller`, `/seller/dashboard`)
- **Purpose:** Operations home with KPIs.
- **Target user:** Seller.
- **Inputs:** seller session.
- **Outputs:** snapshot metrics.
- **Dependencies:** `/api/seller/snapshot`.
- **Limitations:** requires auth; not capturable secret-less.

### Products / Inventory / Orders (`/seller/products*`, `/seller/inventory`, `/seller/orders*`)
- **Purpose:** Catalog, stock, and fulfilment management.
- **Outputs:** listings, stock levels, order status transitions.
- **Dependencies:** `/api/seller/inventory`, `/api/seller/orders/[orderId]/status`.
- **Limitations:** auth-gated.

### Analytics (`/seller/analytics`)
- **Purpose:** Merchant intelligence panel.
- **Dependencies:** `/api/seller/intelligence`, `features/merchant-intelligence`.
- **Limitations:** realized at panel level; deep pricing/forecast studios are unmerged (Phase K).

### Payouts / Store settings / Notifications / Onboarding
- **Purpose:** Finance view, configuration, alerts, signup.
- **Limitations:** `payouts-placeholder`, `support-placeholder` are stubs.

---

## C. Operator / Admin products

### Admin dashboard (`/admin`, `/admin/dashboard`)
- **Purpose:** Platform operations command surface.
- **Target user:** Operator/Admin.
- **Dependencies:** `/api/admin/snapshot`.

### Moderation (`/admin/moderation`, `/products`, `/reviews`)
- **Purpose:** Content/listing/review moderation.
- **Outputs:** moderation decisions.
- **Dependencies:** `/api/admin/moderation/product`, `/api/governance/detection`.

### Vendors (`/admin/vendors`, `/[id]`)
- **Purpose:** Vendor lifecycle (approve/suspend).
- **Dependencies:** `/api/admin/moderation/vendor`.

### Orders / Refunds / Categories / Analytics / Audit logs / Flags / Settings / Notifications
- **Purpose:** Cross-cutting marketplace governance and configuration.
- **Dependencies:** `/api/payments/refunds`, observability, governance, flags.
- **Limitations:** `platform-health-placeholder` is a stub.

---

## D. System / API products (no UI)

| Product | Purpose | Inputs | Outputs | Limitations |
|---|---|---|---|---|
| Health/Readiness (`/api/health`, `/api/readiness`) | Liveness/readiness | — | 200 status | — |
| Operations (`/api/operations/*`, `/api/ops/async/*`, `/api/worker`) | Ops health, release, async workers | env, jobs | status, release manifest | env-gated (Supabase) |
| Payments (`/api/payments/*`) | Razorpay order/verify/webhook, reconciliation, refunds | payment payloads | transactions | requires Razorpay keys |
| Logistics (`/api/logistics/*`) | Delivery/dispatch/reconciliation | delivery data | dispatch state | env-gated |
| Intelligence (`/api/intelligence/*`) | Search + embeddings | query/docs | results/vectors | text-only |
| Advanced tiers (`/api/tier10/*`, `/api/tier14`, `/api/tier15`) | Introspection of civilizational/universal/knowledge engines | request | JSON introspection | **no UI consumer; product value = 0 until surfaced** |
| Governance (`/api/governance/detection`) | Risk/abuse detection | events | detections | — |
| Public API (`/api/public/v1/events`) | External event intake | events | ack | — |

---

## E. Handbook-level conclusion

> The handbook describes a **complete, coherent hyperlocal commerce product** (buyer + seller + operator) backed by a broad system/API layer. The "advanced" entries are **API-only** — documented here for completeness but carrying **no end-user usage path** on the certified branch.
