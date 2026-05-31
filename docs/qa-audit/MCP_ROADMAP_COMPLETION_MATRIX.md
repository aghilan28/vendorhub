# MCP Roadmap Completion Matrix

**Method:** Audited against the ORIGINAL 6-part MCP roadmap, from source code on `main`.
**Date:** 2026-05-31
**Note:** Most MCP engine work lives on UNMERGED branches (PRs #15–#37). This matrix marks where the deliverable actually resides.

---

## MCP-1 — Core Marketplace Foundation

| Deliverable | Status | Evidence |
|-------------|--------|----------|
| Auth + RBAC | ✅ Implemented (main) | `middleware.ts`, `user_roles`, `current_user_has_role()` security-definer fn |
| User roles (Buyer/Seller/Admin/Super) | ✅ Implemented (main) | `lib/constants/marketplace.ts` APP_ROLES |
| Product/Order/Cart schema | ✅ Implemented (main) | `phase_1_marketplace_core` migration, 20+ core tables |
| Cart operations | ✅ Implemented (main) | `lib/actions/cart.ts` → `upsert_live_cart_item` RPC |
| Order lifecycle | ✅ Implemented (main) | `features/transactions/lifecycle.ts`, 9-state machine |
| Payments (Razorpay) | ✅ Implemented (main) | `lib/payments/orchestration.ts`, order/verify/webhook routes |

**MCP-1 verdict: IMPLEMENTED on main.**

---

## MCP-2 — Exhaustive Catalog System

| Deliverable | Status | Evidence |
|-------------|--------|----------|
| Taxonomy | ⚠️ Partial (main) / Implemented (branch) | `config/catalog/taxonomy.json` NOT on main; on MCP-0B branch |
| Attributes/Variants | ⚠️ Partial | `lib/commerce-foundation/catalog.ts` (119 lines); variant tables exist |
| Bulk import (CSV) | ⚠️ Partial (branch) | MCP-1B import platform on unmerged branch |
| Quality scoring | ⚠️ Partial (branch) | `lib/catalog-governance/engine.ts` (290 lines) on main, fuller on branch |
| Media pipeline | ❌ Branch only | MCP-0A `lib/media/` not on main |
| Searchability | ✅ Implemented (main) | `listLiveProducts` real query + status=ACTIVE filter |

**MCP-2 verdict: PARTIALLY IMPLEMENTED (core on main, scale on branches).**

---

## MCP-3 — Seller Operating System

| Deliverable | Status | Evidence |
|-------------|--------|----------|
| Store creation | ✅ Implemented (main) | `/seller-registration`, vendor tables |
| Catalog management | ✅ Implemented (main) | `features/seller/components/products-screen.tsx`, real CRUD |
| Inventory | ✅ Implemented (main) | `/api/seller/inventory`, `inventoryStatus()` |
| Orders | ✅ Implemented (main) | `/api/seller/orders/[orderId]/status`, state machine |
| Pricing | ⚠️ Partial | Price fields editable; no dynamic pricing UI on main |
| Coupons/Promotions | ❌ Branch only | `seller_promotions` migration on MCP-0C branch |
| Payouts | ⚠️ Placeholder (main) | `/seller/payouts-placeholder` |
| Seller Intelligence | ✅ Implemented (main) | `features/merchant-intelligence/engine.ts` (453 lines) |

**MCP-3 verdict: PARTIALLY IMPLEMENTED (operations real, payouts/promotions gap).**

---

## MCP-4 — Buyer Experience System

| Deliverable | Status | Evidence |
|-------------|--------|----------|
| Homepage/Discovery | ✅ Implemented (main) | `/home`, live products |
| Search | ✅ Implemented (main) | `/api/intelligence/search` + degrade-safe fallback |
| Cart/Checkout | ✅ Implemented (main) | Atomic checkout RPC |
| Orders/Tracking | ✅ Implemented (main) | `/orders`, `/tracking` |
| Wishlist | ✅ Implemented (main) | `lib/actions/wishlist.ts` |
| Reviews (submit) | ❌ Missing (main) | Read-only display; no submission UI |
| Returns/Refunds (buyer) | ❌ Missing (main) | No buyer return flow |
| Support/Disputes | ❌ Branch only | MCP-1E on unmerged branch |

**MCP-4 verdict: PARTIALLY IMPLEMENTED (purchase loop real, post-purchase gaps).**

---

## MCP-5 — Commerce Intelligence Activation

| Deliverable | Status | Evidence |
|-------------|--------|----------|
| Merchant Intelligence | ✅ Implemented (main) | `features/merchant-intelligence/engine.ts`, real DB inputs |
| AI Search/Ranking | ✅ Implemented (main) | `lib/ai/` embeddings + hybrid ranking |
| Recommendations | ⚠️ Partial | `intelligent-product-grid`, needs OpenAI key |
| Marketplace Intelligence | ❌ Branch only | MCP-0E `lib/marketplace-intelligence/` on branch |
| Tier engines (10-15) | ⚠️ Demo/Disconnected | `lib/tier10-15/` exist (1013+ lines) but not wired to live commerce |

**MCP-5 verdict: PARTIALLY IMPLEMENTED (seller intelligence real, marketplace-wide on branch).**

---

## MCP-6 — Production Readiness

| Deliverable | Status | Evidence |
|-------------|--------|----------|
| Auth security | ✅ Implemented (main) | Middleware + RBAC |
| RLS | ✅ Implemented (main) | 170 `enable RLS` + 254 `CREATE POLICY` statements |
| Rate limiting | ✅ Implemented (main) | 18 routes, `lib/security/rate-limit.ts` |
| Error tracking | ✅ Implemented (main) | Sentry (3 configs) |
| HTTP security headers | ❌ Missing (main) | No `headers()` in next.config |
| Async scheduler | ❌ Missing (main) | `vercel.json` has NO crons |
| Build type safety | ❌ Disabled (main) | `ignoreBuildErrors: true` |
| Image host config | ❌ Incomplete (main) | Only `images.unsplash.com` whitelisted, no Supabase storage |

**MCP-6 verdict: PARTIALLY IMPLEMENTED (strong auth/RLS, deployment hardening gaps).**

---

## Summary

| Roadmap | Status | Location |
|---------|--------|----------|
| MCP-1 Core Foundation | ✅ Implemented | main |
| MCP-2 Catalog | ⚠️ Partial | main + branches |
| MCP-3 Seller OS | ⚠️ Partial | main + branches |
| MCP-4 Buyer Experience | ⚠️ Partial | main + branches |
| MCP-5 Intelligence | ⚠️ Partial | main + branches |
| MCP-6 Production Readiness | ⚠️ Partial | main |

**Overall: Foundation is solid and real. Catalog/Buyer/Seller/Intelligence have real cores with feature gaps. Production readiness has the biggest concrete gaps (headers, crons, build safety).**
