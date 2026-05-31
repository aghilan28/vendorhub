# Buyer Experience Audit

**Method:** Source code review of buyer pages, components, and queries on `main`.
**Scoring:** 0–10 per area. Benchmarked against Amazon / Flipkart / Blinkit / Zepto.
**Date:** 2026-05-31

---

## Scores

| Area | Score | Evidence | Benchmark Gap |
|------|-------|----------|---------------|
| Homepage | 7/10 | `/home` server component loads live products from DB | No personalized hero, no banners/deals carousel |
| Search | 7/10 | `/api/intelligence/search` AI + degrade-safe fallback, location-aware | No autocomplete/typeahead, no search filters UI depth |
| Discovery | 6/10 | `intelligent-product-grid`, category nav | No collections, no curated lists, no "deals of day" |
| Categories | 5/10 | `/categories`, `/categories/[slug]` real query | No category images, shallow hierarchy display |
| Collections | 2/10 | No collections route/feature | Amazon/Flipkart have rich curated collections |
| Recommendations | 5/10 | `getLiveRelatedProductIds`, needs OpenAI | No "frequently bought together", no post-purchase recs |
| Wishlist | 7/10 | `lib/actions/wishlist.ts`, DB-persisted, `/wishlist` | No wishlist sharing, no price-drop alerts |
| Cart | 8/10 | Real RPC `upsert_live_cart_item`, multi-item | No save-for-later on main, no cart-level coupons |
| Checkout | 7/10 | Atomic checkout RPC, address + payment method + Zod | No saved addresses picker, no delivery slot selection |
| Addresses | 3/10 | Inline in checkout only; no `/addresses` management page | Amazon has full address book |
| Orders | 8/10 | `/orders`, `/orders/[id]` real DB queries | No reorder button, no order-level invoice download on main |
| Tracking | 5/10 | `/tracking`, `/tracking/[id]` route exists | No live map, no carrier integration on main |
| Notifications | 5/10 | `/notifications` reads DB; in-app only | No email/SMS/push delivery wired |
| Returns | 1/10 | No return flow exists | Amazon/Flipkart core feature |
| Refunds (buyer-initiated) | 2/10 | Refund API exists but admin-side; no buyer request UI | Self-service refund missing |
| Support | 2/10 (main) | Branch has real `/support` (MCP-1E); main has none | Chat/ticket missing on main |
| Ratings | 4/10 | `rating-display` component, reads DB | No rating submission flow |
| Reviews | 4/10 | Review display + `reviews` table | No review write UI on main |
| Mobile UX | 7/10 | `mobile-nav`, `mobile-store`, responsive components | Generally solid |
| PWA | 8/10 | Service worker, offline page, install prompt, push config | Strong; delivery of push not wired |

---

## Aggregate

**Average: 5.2/10**

| Tier | Areas |
|------|-------|
| Strong (7-8) | Cart, Checkout, Orders, Homepage, Search, Wishlist, Mobile, PWA |
| Adequate (5-6) | Discovery, Categories, Recommendations, Tracking, Notifications |
| Weak (1-4) | Collections, Addresses, Returns, Refunds, Support, Ratings, Reviews |

---

## Benchmark Reality

- **vs Blinkit/Zepto (hyperlocal grocery):** ~40% parity. Purchase loop is comparable; missing 10-min delivery infra (not software), live tracking maps, and slot selection.
- **vs Amazon/Flipkart (general marketplace):** ~20% parity. Missing returns/exchanges (table stakes), review system, collections, A-to-Z guarantee, recommendation depth.

## Top Buyer Gaps (by impact)
1. No returns/exchange flow (CRITICAL for trust)
2. No review submission (CRITICAL for marketplace trust loop)
3. No address book (HIGH friction)
4. No buyer-initiated refund self-service (HIGH)
5. Support/disputes only on unmerged branch (HIGH)
