# EC1 Capability Matrix

**Branch:** `release/v1-candidate` (consolidated)
**Date:** 2026-05-31
**Legend:** REAL (DB/integration-backed) · PARTIAL (logic real, gaps) · PLACEHOLDER · DEPRECATED · DUPLICATED

---

## Buyer Capabilities

| Capability | Status | Evidence |
|-----------|--------|----------|
| Browse / Home | REAL | `/home` live products |
| AI Search | REAL | `/api/intelligence/search`, OpenAI + fallback |
| Smart Discovery | REAL | `/discover` (MCP-0E) |
| Product Detail | REAL | `/product/[slug]` |
| Cart | REAL | RPC `upsert_live_cart_item` |
| Checkout | REAL | atomic checkout RPC |
| Payment | REAL | Razorpay order/verify/webhook |
| Orders & Tracking | REAL | `/orders`, `/tracking` |
| Wishlist | REAL | `lib/actions/wishlist.ts` |
| Nearby Stores | PARTIAL | `/nearby` (MCP-1C), env-gated geo |
| Rewards/Loyalty | PARTIAL | `/rewards` (MCP-1D), sample without event DB |
| Support Tickets | REAL | `/support` (MCP-1E) |
| Disputes | REAL | `/disputes` (MCP-1E) |
| Returns/Refunds (self-service) | PARTIAL | refund engine exists, limited buyer UI |
| Reviews (submit) | PARTIAL | schema + display; submission limited |

## Seller Capabilities

| Capability | Status | Evidence |
|-----------|--------|----------|
| Registration & Onboarding | REAL | `/seller-registration`, `/seller/onboarding` (MCP-1A) |
| Activation Center | PARTIAL | `/seller/activation` (MCP-1A) |
| Product CRUD | REAL | `lib/actions/products.ts` |
| Catalog Ops | PARTIAL | `/seller/catalog-ops` (MCP-1B) |
| Media Center | PARTIAL | `/seller/media` (MCP-0A), upload env-gated |
| Inventory | REAL | `/api/seller/inventory` |
| Orders / Fulfillment | REAL | `/seller/orders`, `/seller/fulfillment` (MCP-0F) |
| Seller OS Cockpit | REAL | `/seller/operations` (MCP-0C) |
| Promotions/Coupons | PARTIAL | `seller_promotions` migration (MCP-0C) |
| Payouts | PARTIAL | `/seller/payouts` real route (MCP-0G fixed placeholder) |
| Reputation | PARTIAL | `/seller/reputation` (MCP-0D) |
| Hyperlocal Config | PARTIAL | `/seller/hyperlocal` (MCP-1C) |
| Seller Intelligence | REAL | `/api/seller/intelligence` |
| Seller Support | REAL | `/seller/support` (MCP-1E ticket system) |

## Admin Capabilities

| Capability | Status | Evidence |
|-----------|--------|----------|
| Dashboard | REAL | `getAdminOperationalSnapshot()` |
| Vendor Governance | REAL | `/admin/vendors`, moderation API |
| Moderation | REAL | `/admin/moderation/*` |
| Orders Oversight | REAL | `/admin/orders` |
| Refunds | PARTIAL | `/admin/refunds` |
| Catalog Governance | PARTIAL | `/admin/catalog`, `/admin/catalog-governance` |
| Trust Governance | PARTIAL | `/admin/trust` (MCP-0D) |
| Seller Governance | REAL | `/admin/sellers` (MCP-1A) |
| Population Ops | PARTIAL | `/admin/population` (MCP-1A) |
| Location/Network | PARTIAL | `/admin/location` (MCP-1C) |
| Growth Ops | PARTIAL | `/admin/growth` (MCP-1D) |
| Operations Center | REAL | `/admin/operations` (MCP-1E) |
| Commerce Governance | PARTIAL | `/admin/commerce` (MCP-0F) |
| Marketplace Intelligence | PARTIAL | `/admin/intelligence` (MCP-0E) |
| Platform Health | PARTIAL | `/admin/platform-health` (MCP-0G fixed) |
| Execution OS | DEPRECATED-ish | `/admin/execution` (M8, demo data) |

## Cross-Cutting

| Capability | Status | Evidence |
|-----------|--------|----------|
| Auth + RBAC | REAL | middleware + user_roles |
| RLS | REAL | 170 enable + 254 policies |
| Rate Limiting | REAL | 18 routes |
| Observability | REAL | Sentry + operational events |
| PWA/Offline | REAL | service worker |
| i18n (en/ta/hi) | PARTIAL | framework complete |
| Commerce Intelligence (tier) | DEPRECATED | tier10–15 demo, disconnected from live commerce |
| Platform/Showcase | DEPRECATED | `/platform`, `/showcase` (N/O demonstration layer) |

---

## Summary

| Status | Count | Note |
|--------|-------|------|
| REAL | 25 | DB/integration-backed |
| PARTIAL | 24 | Logic real, needs live data/UX |
| PLACEHOLDER | 0 | All removed by MCP-0G |
| DEPRECATED | 3 | Tier engines, platform/showcase demo layers |
| DUPLICATED | 1 | `/product/[slug]` vs `/products/[id]` (see duplication audit) |

**Consolidated platform has 0 placeholders and only research/demonstration layers as deprecated. The operating marketplace surface is REAL or PARTIAL throughout.**
