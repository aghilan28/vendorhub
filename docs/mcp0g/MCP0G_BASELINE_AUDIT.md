# MCP-0G — Baseline Audit (evidence-based, from code)

> Final-phase context recovery. Every claim is grounded in a file path / command
> output on `feat/mcp0f-commerce-transaction` (the MCP-0F tip). Prior reports were
> not trusted; the repository is the source of truth.

## 0. Starting state (verified by execution)

| Gate | Result (pre-0G) |
|---|---|
| `tsc --noEmit` | ✅ 0 errors |
| `eslint .` | ✅ 0 errors (1 pre-existing `Tier14ResearchConcept` warning) |
| `vitest run` | ✅ 357 / 43 files |
| `next build` | ✅ success |

Chain: M8 → N → O → audit → 0A → 0B → 0C → 0D → 0E → 0F → **0G**.

## 1. Surface inventory
- **69 page routes**, **39 API routes**.
- Route groups: `(buyer)`, `(seller)`, `(admin)`, `(auth)`, `(public)`.
- Shared design primitives (`PageContainer`, `GovernanceCard`/`OperationalCard`,
  `Badge`, `operational-surface`, `EmptyState`) used across **105** files.
- Polish library present: `dashboard-skeleton`, `empty-state`, `error-state`,
  `loading-state`, `page-loader`, `search-skeleton`, `skeleton-grid`,
  `table-skeleton`, plus `ui/skeleton` and `ui/toast`.

## 2. Coherence defects found (and fixed in 0G)
| Defect | Evidence | Fix |
|---|---|---|
| Nav linked **placeholder** routes while real pages existed | `sellerNavigation` → `/seller/payouts-placeholder` although `/seller/payouts` re-exported the same real `SellerPayoutsScreen`; `adminNavigation` → `/admin/platform-health-placeholder` although it rendered the real `PlatformHealthScreen` | Repointed nav to clean routes; consolidated. |
| **Duplicate** route | `/seller/payouts` + `/seller/payouts-placeholder` rendered identical screens | Deleted the `-placeholder` route; `/seller/payouts` is self-contained. |
| **Orphan/stub** routes | `/seller/support-placeholder` rendered a dead "not started" EmptyState | Replaced with a real `/seller/support` Help & Support center. |
| Stub route names leaked to URLs | three `*-placeholder` URLs | Removed; clean URLs `/seller/payouts`, `/seller/support`, `/admin/platform-health`. |
| Group-level loading states missing | only root `app/loading.tsx` | Added `(buyer)`, `(seller)`, `(admin)` `loading.tsx`. |

## 3. Journey readiness (pre-0G, from code)
- **Buyer** — discover/search/categories/product/cart/checkout/orders/tracking
  realised across 0A/0B/0E/0F; Order Center unifies post-purchase.
- **Seller** — dashboard/operations/fulfillment/intelligence/reputation/products/
  catalog/media/inventory/orders/analytics/payouts realised across 0A/0C/0D/0F.
- **Admin** — dashboard/intelligence/execution/trust/catalog/commerce/refunds/
  moderation/platform-health realised across 0D/0E/0F.
- **Intelligence** — 0E engine + 0F transaction intelligence both bridge into the
  execution/governance/simulation activation connectors.
- **Trust** — 0D reviews/returns/refunds/disputes reused by 0F post-purchase.
- **Transactions** — 0F engine + real atomic-checkout / Razorpay / refund rail.

## 4. Scope of MCP-0G
Product quality, **not** new subsystems: navigation coherence (no dead/duplicate/
orphan routes, backed by an automated certification test), polish consistency,
group loading states, and the full certification deliverable set. No new engine.

## 5. Honest scope
No live DB in the sandbox; surfaces degrade to clearly-labelled samples. Runtime
journey checks rely on the production build + the deterministic engine tests
rather than an interactive server. Lighthouse-style field metrics are not
measured here (no hosted target); bundle/route sizes are taken from the real
`next build` output.
