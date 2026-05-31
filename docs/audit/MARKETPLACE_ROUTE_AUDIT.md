# MARKETPLACE ROUTE AUDIT (Section 2)

All routes enumerated from `app/**/page.tsx` and `app/**/route.ts`. "Builds" is
confirmed (prior `next build` exit 0). "Functional" means it does real work when
env + data are present. **"Empty"** means it builds and renders chrome but shows
no data without Supabase/keys (graceful fallback). **"Demo"** means backed by
static seed, never live data. **"Placeholder"** means an explicit stub screen.

Legend: ✅ functional · ⚠️ empty-without-env · 🧪 demo/seed · 🚧 placeholder

---

## Public

| Route | Class | Status | Evidence |
|-------|-------|--------|----------|
| `/` , `/home` | Buyer | ⚠️ | Renders catalog from `listLiveProducts`; empty without env |
| `/demo`, `/launch` | Public | ✅ | Static marketing |
| `/platform`, `/platform/docs` | Platform | 🧪 | Static model `lib/platform/*` |
| `/showcase` | Platform | 🧪 | Static scenario model |
| `/offline` | Public | ✅ | PWA offline page |

## Buyer

| Route | Status | Evidence |
|-------|--------|----------|
| `/search` | ⚠️ | Real AI/pgvector search; empty without env/OpenAI |
| `/categories`, `/categories/[slug]` | ⚠️ | DB categories; empty fallback |
| `/product/[slug]` | ⚠️ | `getLiveProductBySlug` (real); gallery repeats one image; reviews are placeholder text |
| `/products/[id]` | ⚠️ | DB product |
| `/cart` | ⚠️ | `listLiveCartItems` (real, per-user); empty fallback |
| `/checkout` | ⚠️ | Checkout transaction + payment flow |
| `/orders`, `/orders/[id]` | ⚠️ | `listBuyerOrders` (real, auth-gated) |
| `/tracking`, `/tracking/[id]` | ⚠️ | Logistics queries |
| `/wishlist` | ⚠️ | `lib/api/queries/wishlist.ts` (real) |
| `/profile` | ⚠️ | Profile; thin |

## Seller

| Route | Status | Evidence |
|-------|--------|----------|
| `/seller`, `/seller/dashboard` | ⚠️🧪 | Hybrid: real `/api/seller/snapshot` + static stub panels (`features/seller/data.ts`) |
| `/seller/products`, `/products/[id]`, `/products/new` | ⚠️ | Real create/update actions; **no image upload** |
| `/seller/inventory` | ✅ | Real PATCH `/api/seller/inventory` |
| `/seller/orders`, `/orders/[id]` | ✅ | Real PATCH order status |
| `/seller/analytics` | 🧪 | Largely static/derived |
| `/seller/onboarding` | ⚠️ | Onboarding shell |
| `/seller/notifications`, `/store-settings` | ⚠️ | Thin |
| `/seller/payouts-placeholder`, `/seller/support-placeholder` | 🚧 | **Explicit placeholder stubs** |

## Admin

| Route | Status | Evidence |
|-------|--------|----------|
| `/admin`, `/admin/dashboard` | ⚠️ | Real `/api/admin/snapshot` (`getAdminOperationalSnapshot`) |
| `/admin/vendors`, `/vendors/[id]` | ⚠️ | DB vendors |
| `/admin/moderation`, `/products`, `/reviews` | ✅ | Real moderation actions, guarded + audited |
| `/admin/orders`, `/refunds`, `/categories`, `/flags`, `/audit-logs`, `/notifications`, `/analytics` | ⚠️ | DB-backed snapshots/queries |
| `/admin/settings` | ⚠️ | Thin |
| `/admin/platform-health-placeholder` | 🚧 | **Explicit placeholder stub** |
| `/admin/execution` | 🧪 | M8 zustand seed, not DB |

## API (38 routes)

| Group | Status | Evidence |
|-------|--------|----------|
| `/api/admin/*`, `/api/seller/*` | ✅ | Delegate to DB-backed queries/actions |
| `/api/payments/razorpay/*`, `/reconciliation`, `/refunds` | ✅ | Real Razorpay orchestration |
| `/api/logistics/*`, `/api/operations/*`, `/api/ops/*` | ✅ | Real DB / worker endpoints |
| `/api/intelligence/{search,embedding,embeddings/refresh}` | ✅ | Real AI/vector (env-gated) |
| `/api/governance/detection` | ✅ | DB via `features/governance/server` |
| `/api/execution` | 🧪 | Deterministic seed compute (not DB) |
| `/api/tier10/*`, `/api/tier14`, `/api/tier15` | 🧪 | Deterministic compute engines |
| `/api/health`, `/api/readiness` | ✅ | Health checks |

## Summary

- **Dead routes:** none — all build.
- **Explicit placeholders:** 3 (`platform-health-placeholder`, `payouts-placeholder`,
  `support-placeholder`).
- **Demo/seed routes:** `/admin/execution`, `/platform`, `/platform/docs`,
  `/showcase`, `/api/execution`, `/api/tier*`.
- **Dominant runtime risk:** ~30 buyer/seller/admin routes are **functional in
  code but empty without env + seed data**. The marketplace's "liveness" is
  entirely a configuration + data-ingestion problem, not a code-existence problem.
