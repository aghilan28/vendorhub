# Deliverable 3 — Product Surface Inventory

**Section 2 of the directive.** Exhaustive inventory of every route/page/surface in the **certified working tree** (`phase-l-finalization` @ `98350f0`). Evidence: enumeration of `app/**/page.tsx` (54) and `app/api/**/route.ts` (37).

Legend — **Status:** ✅ realized (reachable UI workflow) · ⚙️ operator/admin surface · 🔌 API-only (no UI) · 🧩 placeholder. **Role:** Buyer / Seller / Admin(Operator) / System.

## 3.1 Buyer surfaces — route group `(buyer)`

| Route | Purpose | Tier | Dependencies | Role | Status |
|---|---|:--:|---|---|:--:|
| `/` & `/home` | Marketplace home / discovery feed | T1/T2 | products, geo, recommendations | Buyer | ✅ |
| `/categories`, `/categories/[slug]` | Category browse | T1 | catalog | Buyer | ✅ |
| `/products/[id]`, `/product/[slug]` | Product detail | T1 | catalog, pricing, ratings | Buyer | ✅ |
| `/search` | Search (semantic + fallback) | T4/T9 | `/api/intelligence/search` | Buyer | ✅ |
| `/cart` | Cart | T1 | cart store | Buyer | ✅ |
| `/checkout` | Checkout + Razorpay | T1 | `/api/payments/razorpay/*` | Buyer | ✅ |
| `/orders`, `/orders/[id]` | Order history & detail | T1 | orders | Buyer | ✅ |
| `/tracking`, `/tracking/[id]` | Delivery tracking | T3 | logistics | Buyer | ✅ |
| `/wishlist` | Wishlist | T1 | wishlist store | Buyer | ✅ |
| `/profile` | Buyer profile | T1 | auth | Buyer | ✅ |

## 3.2 Seller surfaces — route group `(seller)`

| Route | Purpose | Tier | Dependencies | Role | Status |
|---|---|:--:|---|---|:--:|
| `/seller`, `/seller/dashboard` | Seller home/dashboard | T1/T7 | `/api/seller/snapshot` | Seller | ✅ |
| `/seller/products`, `/products/[id]`, `/products/new` | Catalog management | T1 | products | Seller | ✅ |
| `/seller/inventory` | Inventory management | T1/T7 | `/api/seller/inventory` | Seller | ✅ |
| `/seller/orders`, `/orders/[id]` | Order fulfilment | T1/T3 | `/api/seller/orders/[orderId]/status` | Seller | ✅ |
| `/seller/analytics` | Seller analytics | T7 | `/api/seller/intelligence` | Seller | ✅ |
| `/seller/notifications` | Notifications | T1 | push | Seller | ✅ |
| `/seller/onboarding`, `/seller-registration` | Onboarding/registration | T1 | auth | Seller | ✅ |
| `/seller/store-settings` | Store settings | T1 | seller | Seller | ✅ |
| `/seller/payouts` | Payouts | T11(finance) | finance | Seller | ✅ |
| `/seller/payouts-placeholder`, `/seller/support-placeholder` | Placeholders | — | — | Seller | 🧩 |

## 3.3 Admin / Operator surfaces — route group `(admin)`

| Route | Purpose | Tier | Dependencies | Role | Status |
|---|---|:--:|---|---|:--:|
| `/admin`, `/admin/dashboard` | Admin home | T1.5 | `/api/admin/snapshot` | Admin | ⚙️ |
| `/admin/vendors`, `/vendors/[id]` | Vendor management | T1.5 | `/api/admin/moderation/vendor` | Admin | ⚙️ |
| `/admin/moderation`, `/products`, `/reviews` | Moderation command surface | T1.5 | `/api/admin/moderation/product` | Admin | ⚙️ |
| `/admin/categories` | Category governance | T1 | catalog | Admin | ⚙️ |
| `/admin/orders` | Order oversight | T1 | orders | Admin | ⚙️ |
| `/admin/refunds` | Refund processing | T1/finance | `/api/payments/refunds` | Admin | ⚙️ |
| `/admin/analytics` | Platform analytics | T9 | observability | Admin | ⚙️ |
| `/admin/audit-logs` | Audit log viewer | T8/gov | governance | Admin | ⚙️ |
| `/admin/flags` | Feature flags | T1 | flags | Admin | ⚙️ |
| `/admin/notifications` | Notification center | T1 | push | Admin | ⚙️ |
| `/admin/settings` | Platform settings | T1 | config | Admin | ⚙️ |
| `/admin/platform-health-placeholder` | Health placeholder | — | — | Admin | 🧩 |

## 3.4 Auth & public surfaces

| Route | Purpose | Role | Status |
|---|---|---|:--:|
| `/sign-in`, `/sign-up`, `/auth/login`, `/auth/register` | Authentication | All | ✅ |
| `/demo` | Demo/showcase | Public | ✅ |
| `/launch` | Launch page | Public | ✅ |
| `/offline` | PWA offline fallback | All | ✅ |

## 3.5 API surfaces (37 routes; no UI of their own)

| Group | Routes | Tier | Role |
|---|---|:--:|---|
| Health/readiness | `/api/health`, `/api/readiness` | sys | System |
| Operations | `/api/operations/health`, `/operations/release`, `/api/ops/async/health`, `/ops/async/worker`, `/api/worker` | sys | System/Operator |
| Payments | `/api/payments/razorpay/{order,verify,webhook}`, `/payments/reconciliation`, `/payments/refunds` | T1/finance | Buyer/System |
| Logistics | `/api/logistics/{deliveries,deliveries/[id],dispatch,health,reconciliation}` | T3 | Seller/Operator |
| Intelligence | `/api/intelligence/{search,embedding,embeddings/refresh}` | T4/T9 | Buyer/System |
| Seller | `/api/seller/{snapshot,intelligence,inventory,orders/[orderId]/status}` | T1/T7 | Seller |
| Admin | `/api/admin/{snapshot,moderation/product,moderation/vendor}` | T1.5 | Admin |
| Governance | `/api/governance/detection` | T8/gov | Operator |
| Invoices | `/api/invoices/[orderId]` | T1 | Buyer/Seller |
| Push | `/api/push/subscribe` | T1 | All |
| Public API | `/api/public/v1/events` | platform | System |
| **Advanced tiers (introspection, NO UI)** | `/api/tier10/{alignment,governance,knowledge,simulation}`, `/api/tier14`, `/api/tier15` | T10/T14/T15 | System |

## 3.6 Surfaces named in the directive that are ABSENT from the certified tree

The directive's Section 5 enumerates surfaces that **do not exist** in `phase-l-finalization`. They live on `origin/phase-k/commerce-intelligence-productization` (route group `app/(intelligence)/`):

| Directive name | Phase-K route | In certified tree? |
|---|---|:--:|
| Commerce Intelligence Center | `/(intelligence)/commerce-intelligence` | ❌ unmerged |
| Pricing Studio | `/(intelligence)/pricing`, `/pricing/simulator`, `/pricing/recommendations` | ❌ unmerged |
| Forecast Studio | `/(intelligence)/forecasting`, `/scenarios`, `/comparison` | ❌ unmerged |
| Inventory Intelligence | `/(intelligence)/inventory-intelligence` | ❌ unmerged |
| Supply Intelligence | `/(intelligence)/supply-intelligence` | ❌ unmerged |
| Routing | `/(intelligence)/routing` | ❌ unmerged |
| Telemetry | `/(intelligence)/telemetry` | ❌ unmerged |
| Search Intelligence | `/(intelligence)/search-intelligence` | ❌ unmerged |
| Recommendations | `/(intelligence)/recommendations` | ❌ unmerged |
| Simulation Studio · SECIS Studio · Research Center · Intelligence Center · Knowledge OS · Meta Knowledge Center · Governance Center | **no route anywhere** | ❌ **does not exist as a page on any branch** (backend/API/docs only) |

## 3.7 Totals (certified tree)

- **Pages:** 54 `page.tsx` (incl. 2 placeholders).
- **API routes:** 37 `route.ts`.
- **Route groups:** `(admin)`, `(auth)`, `(buyer)`, `(public)`, `(seller)`, `api`, plus `offline`.
- **Intelligence route group `(intelligence)`:** **absent** (unmerged on Phase K).
