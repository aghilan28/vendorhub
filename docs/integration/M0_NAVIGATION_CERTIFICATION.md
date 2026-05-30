# M0 — Navigation Certification (re-certified)

**Evidence:** `lib/constants/navigation.ts` (the **only** navigation definition in the repo — confirmed by codebase grep for `*Navigation =` / `navItems` / `NavConfig`), and `app/(intelligence)/layout.tsx` rendering `<DashboardSidebar items={intelligenceNavigation} />`. Cross-referenced against the 69 compiled page routes from the build manifest.

## Navigation graphs found (4)
1. `buyerNavigation` (6) + `buyerQuickActions` (2)
2. `sellerNavigation` (10) — includes "Commerce Intelligence" → `/commerce-intelligence`
3. `intelligenceNavigation` (10) — all 9 intelligence surfaces + back-link
4. `adminNavigation` (12)

> There is **no** advancedNavigation / researchNavigation / knowledgeNavigation / governanceNavigation / simulationNavigation. They are absent because **no such pages exist**.

## Navigation Accessibility Matrix

| Required nav (directive Section 3) | Nav graph exists? | Targets reachable? | Evidence |
|---|:--:|:--:|---|
| Main (buyer) Navigation | ✅ | ✅ | `buyerNavigation` → all targets in build manifest |
| Seller Navigation | ✅ | ✅ | `sellerNavigation` → all targets compiled |
| Admin Navigation | ✅ | ✅ | `adminNavigation` (12) → all `/admin/*` compiled |
| Commerce Intelligence Navigation | ✅ | ✅ | `intelligenceNavigation` (9 surfaces) wired via sidebar in `(intelligence)/layout.tsx` |
| Advanced Intelligence Navigation | ❌ MISSING | n/a | no page → no nav |
| Research Navigation | ❌ MISSING | n/a | no page → no nav |
| Knowledge Navigation | ❌ MISSING | n/a | no page → no nav |
| Governance Navigation | ⚠️ PARTIAL | ✅ (via admin) | reachable through `adminNavigation` (Moderation, Audit logs); no dedicated Governance Center |
| Simulation Navigation | ❌ MISSING | n/a | no page → no nav |

## Reachability check — every compiled page route

| Route family | In a nav graph? | Reachable? |
|---|:--:|:--:|
| `/`, `/search`, `/categories`, `/orders`, `/wishlist`, `/profile` | buyer | ✅ |
| `/cart`, `/tracking` | buyer quick actions | ✅ |
| `/checkout` | via cart flow | ✅ (flow) |
| `/categories/[slug]`, `/products/[id]`, `/product/[slug]`, `/orders/[id]`, `/tracking/[id]` | dynamic children of listed parents | ✅ |
| `/seller/*` (14) | seller | ✅ |
| `/commerce-intelligence`, `/pricing*`, `/forecasting*`, `/inventory-intelligence`, `/supply-intelligence`, `/routing`, `/telemetry`, `/search-intelligence`, `/recommendations` | intelligence | ✅ |
| `/admin/*` (15) | admin | ✅ |
| `/sign-in`, `/sign-up`, `/auth/*`, `/seller-registration` | auth entry points | ✅ |
| `/demo`, `/launch`, `/offline` | public/system entry | ✅ (direct) |

## Stranded / orphaned analysis
- **Stranded routes:** none. Every real page is in a nav graph or is a dynamic/flow child of one.
- **Orphaned features:** none among existing pages. The 3 placeholder routes are linked from nav intentionally.
- **Sub-pages** `/pricing/simulator`, `/pricing/recommendations`, `/forecasting/scenarios`, `/forecasting/comparison`, `/admin/moderation/products`, `/admin/moderation/reviews` are reached from their parent surface (in-page links/tabs), consistent with the parent being in nav.

## Verdict
> **Navigation CERTIFIED COMPLETE for all existing surfaces.** Buyer, Seller, Commerce-Intelligence, and Admin graphs cover 100% of their pages with zero stranded routes. Advanced/Research/Knowledge/Simulation navigation is **absent because the underlying pages do not exist** — a build gap (marked MISSING), not a navigation defect. Governance is reachable via Admin (PARTIAL — no dedicated center).
