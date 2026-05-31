# EC1 Route Matrix

**Branch:** `release/v1-candidate`
**Total:** 84 page routes + 41 API routes (verified in build output)
**Date:** 2026-05-31

---

## Status Legend
ACTIVE · DEMO (research/showcase) · DUPLICATE-PAIR · all PLACEHOLDER removed by MCP-0G

---

## Buyer Routes

| URL | Purpose | Status | Owner |
|-----|---------|--------|-------|
| `/`, `/home` | Storefront landing | ACTIVE | Core |
| `/search` | AI search | ACTIVE | Core/0E |
| `/discover` | Smart discovery | ACTIVE | MCP-0E |
| `/categories`, `/categories/[slug]` | Category browse | ACTIVE | Core |
| `/product/[slug]` | Product detail (canonical) | ACTIVE | Core |
| `/products/[id]` | Product detail (by id) | DUPLICATE-PAIR | Core (legacy) |
| `/cart`, `/checkout` | Purchase | ACTIVE | Core/0F |
| `/orders`, `/orders/[id]` | Order center | ACTIVE | 0F |
| `/tracking`, `/tracking/[id]` | Delivery tracking | ACTIVE | Core |
| `/wishlist`, `/profile` | Account | ACTIVE | Core |
| `/nearby` | Hyperlocal stores | ACTIVE | MCP-1C |
| `/rewards` | Loyalty/growth | ACTIVE | MCP-1D |
| `/support` | Support tickets | ACTIVE | MCP-1E |
| `/disputes` | Buyer disputes | ACTIVE | MCP-1E |

## Seller Routes

| URL | Purpose | Status | Owner |
|-----|---------|--------|-------|
| `/seller`, `/seller/dashboard` | Cockpit | ACTIVE | Core |
| `/seller/products`, `/products/new`, `/products/[id]` | Catalog | ACTIVE | Core |
| `/seller/inventory` | Stock | ACTIVE | Core |
| `/seller/orders`, `/orders/[id]` | Fulfillment | ACTIVE | Core |
| `/seller/fulfillment` | Fulfillment command | ACTIVE | MCP-0F |
| `/seller/operations` | Seller OS | ACTIVE | MCP-0C |
| `/seller/analytics` | Analytics | ACTIVE | Core |
| `/seller/payouts` | Payouts (real, placeholder removed) | ACTIVE | MCP-0G |
| `/seller/store-settings` | Settings | ACTIVE | Core |
| `/seller/onboarding`, `/activation`, `/import` | Activation | ACTIVE | MCP-1A |
| `/seller/catalog`, `/catalog-ops` | Catalog ops | ACTIVE | 0B/1B |
| `/seller/media` | Media | ACTIVE | MCP-0A |
| `/seller/reputation` | Reputation | ACTIVE | MCP-0D |
| `/seller/hyperlocal` | Coverage | ACTIVE | MCP-1C |
| `/seller/notifications` | Notifications | ACTIVE | Core |
| `/seller/support` | Support tickets (placeholder removed) | ACTIVE | MCP-1E |

## Admin Routes

| URL | Purpose | Status | Owner |
|-----|---------|--------|-------|
| `/admin`, `/admin/dashboard` | Admin home | ACTIVE | Core |
| `/admin/vendors`, `/vendors/[id]` | Vendor governance | ACTIVE | Core |
| `/admin/moderation`, `/products`, `/reviews` | Moderation | ACTIVE | Core |
| `/admin/orders`, `/refunds` | Commerce oversight | ACTIVE | Core |
| `/admin/categories` | Taxonomy | ACTIVE | Core |
| `/admin/analytics`, `/notifications`, `/flags`, `/audit-logs`, `/settings` | Governance | ACTIVE | Core |
| `/admin/platform-health` | Health (placeholder removed) | ACTIVE | MCP-0G |
| `/admin/sellers`, `/population` | Seller acquisition | ACTIVE | MCP-1A |
| `/admin/catalog`, `/catalog-governance` | Catalog | ACTIVE | 0B/1B |
| `/admin/trust` | Trust governance | ACTIVE | MCP-0D |
| `/admin/intelligence` | Marketplace intelligence | ACTIVE | MCP-0E |
| `/admin/commerce` | Commerce governance | ACTIVE | MCP-0F |
| `/admin/location` | Delivery network | ACTIVE | MCP-1C |
| `/admin/growth` | Growth ops | ACTIVE | MCP-1D |
| `/admin/operations` | Operations center | ACTIVE | MCP-1E |
| `/admin/execution` | Execution OS | DEMO | M8 |
| `/admin/media`, `/admin/catalog` | Media/catalog governance | ACTIVE | 0A/0B |

## Public / Platform / Auth / System

| URL | Purpose | Status |
|-----|---------|--------|
| `/store/[slug]` | Public storefront | ACTIVE (MCP-1A) |
| `/platform`, `/platform/docs` | Platform showcase | DEMO (Phase N/O) |
| `/showcase` | Presentation mode | DEMO (Phase N) |
| `/demo`, `/launch` | Public marketing | ACTIVE |
| `/sign-in`, `/sign-up`, `/auth/login`, `/auth/register`, `/seller-registration` | Auth | ACTIVE |
| `/offline` | PWA offline | ACTIVE |

---

## Findings

| Category | Count |
|----------|-------|
| Conflicting routes | 0 |
| Orphan routes | 0 (all nav-reachable or intentionally public) |
| Dead routes | 0 |
| Broken routes | 0 (build emits all) |
| Placeholder routes | **0** (MCP-0G removed all 3) |
| Duplicate pairs | 1 (`/product/[slug]` + `/products/[id]`, pre-existing) |
| Demo/research routes | 4 (`/platform`, `/platform/docs`, `/showcase`, `/admin/execution`) |

**All routes emit in `next build`. No dead or broken routes. The only cleanup candidates are the demo/research layer (N/O/M8) and one legacy route pair — both non-blocking for v1.**
