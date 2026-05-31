# Seller Experience Audit

**Method:** Source code review of seller pages, components, queries, and APIs on `main`.
**Benchmark:** Amazon Seller Central / Flipkart Seller Hub.
**Date:** 2026-05-31

---

## Scores (0–10)

| Area | Score | Evidence | Gap vs Seller Central |
|------|-------|----------|----------------------|
| Store creation | 7/10 | `/seller-registration` form, vendor tables, `vendor_settings` | No multi-step verified onboarding on main (on MCP-1A branch) |
| Catalog management | 7/10 | `products-screen.tsx` uses `useSellerProducts()`, real CRUD via `lib/actions/products.ts` | No bulk edit on main, no listing quality coaching |
| Inventory | 7/10 | `/api/seller/inventory`, `InventoryStockUpdateSchema`, `inventoryStatus()` | No multi-warehouse, no low-stock automation |
| Orders | 8/10 | `orders-screen.tsx`, `/api/seller/orders/[orderId]/status` with state machine | No bulk order actions, no shipping label generation |
| Pricing | 4/10 | Price fields editable on products | No dynamic/competitive pricing, no bulk price update on main |
| Coupons | 1/10 (main) | No coupon creation; `seller_promotions` on MCP-0C branch only | Seller Central has rich promotions |
| Promotions | 1/10 (main) | Same — branch only | Missing |
| Analytics | 6/10 | `/seller/analytics`, `getSellerOperationalSnapshot()` real data | No cohort/funnel analytics, limited time-series |
| Payouts | 2/10 | `/seller/payouts-placeholder` (navigation points here!) | No real payout dashboard on main; `features/commerce-finance/payouts` exists but route is placeholder |
| Reviews (seller view) | 3/10 | Reviews table readable | No seller review-response flow |
| Intelligence | 7/10 | `features/merchant-intelligence/engine.ts` (453 lines), `/api/seller/intelligence` | Genuinely strong — health scoring, recommendations on real data |
| Operations | 3/10 (main) | Support placeholder; MCP-1E ops on branch | No seller issue/escalation on main |

---

## Aggregate

**Average: 4.7/10**

| Tier | Areas |
|------|-------|
| Strong (7-8) | Orders, Catalog, Inventory, Store creation, Intelligence |
| Adequate (5-6) | Analytics |
| Weak (1-4) | Pricing, Coupons, Promotions, Payouts, Reviews, Operations |

---

## Key Evidence Notes

- **Real data path confirmed:** `getSellerOperationalSnapshot()` reads live products/inventory/orders and builds merchant intelligence — this is NOT mock.
- **Navigation defect:** `sellerNavigation` in `lib/constants/navigation.ts` points to `/seller/payouts-placeholder` and `/seller/support-placeholder` — the REAL `/seller/payouts` and `/seller/support` routes exist but are not linked from nav on main (fixed in MCP-0G branch).
- **Payout backend exists** (`features/commerce-finance/payout-orchestration`, `payouts`) but the seller-facing route is a placeholder.

---

## Benchmark Reality

- **vs Amazon Seller Central / Flipkart Seller Hub:** ~35% parity. Core listing + order + inventory management is real and functional. Missing: promotions engine, payout self-service UX, bulk operations, advertising, performance/health enforcement at scale, shipping label generation.

## Top Seller Gaps (by impact)
1. Payouts route is placeholder (CRITICAL — sellers must see earnings)
2. No promotions/coupons on main (HIGH — sellers need marketing tools)
3. No bulk operations (HIGH at scale)
4. No dynamic pricing tools (MEDIUM)
5. Seller support/operations only on branch (MEDIUM)
