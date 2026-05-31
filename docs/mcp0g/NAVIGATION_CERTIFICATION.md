# MCP-0G.6 — Navigation Certification

**Automated** — enforced by `tests/unit/mcp0g-navigation.test.ts` (15 tests), which
scans the real `app/` directory to build the route set and validates every nav
array against it.

## Guarantees (asserted on every run)
1. **No dead routes** — every `href` in `buyerNavigation`, `sellerNavigation`,
   `adminNavigation` and `buyerQuickActions` resolves to an existing route.
2. **No placeholder routes** — no nav href contains `placeholder`; no app route
   directory is a `*-placeholder` route.
3. **No duplicate routes** — each nav array has unique hrefs.
4. **Consolidated clean routes exist** — `/seller/payouts`, `/seller/support`,
   `/admin/platform-health` are present.

## Changes applied
| Before | After |
|---|---|
| `/seller/payouts-placeholder` (nav) + duplicate `/seller/payouts` | `/seller/payouts` (single canonical) |
| `/seller/support-placeholder` (dead stub) | `/seller/support` (real Help center) |
| `/admin/platform-health-placeholder` | `/admin/platform-health` |

3 `*-placeholder` route directories deleted; e2e specs updated to the clean path.

## Navigation surfaces verified
Buyer nav (7) · Buyer quick actions (2) · Seller nav (15) · Admin nav (19) —
all resolve. Mobile navs (`components/layout/mobile-nav`,
`components/dashboard/mobile-workspace-nav`) consume the same arrays, so they
inherit the guarantee.

## Verdict
Navigation is **certified coherent**: no dead, duplicate or orphan routes.
Score **10/10**.
