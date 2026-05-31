# EC1 Navigation Audit

**Branch:** `release/v1-candidate`
**Source:** `lib/constants/navigation.ts` (single source of truth)
**Date:** 2026-05-31

---

## Navigation Sources

| Nav Group | Entries | Status |
|-----------|---------|--------|
| `buyerNavigation` | Home, Search, Categories, Orders, Wishlist, Profile | ✅ All resolve |
| `buyerQuickActions` | Cart, Tracking | ✅ All resolve |
| `sellerNavigation` | Dashboard, Products, Inventory, Orders, Analytics, Store settings, Notifications, Payouts, Support | ✅ All resolve |
| `adminNavigation` | Dashboard, Vendors, Moderation, Orders, Refunds, Categories, Analytics, Notifications, Flags, Audit logs, Platform health, Settings | ✅ All resolve |

**Total nav hrefs:** 55 (verified via grep).

---

## Critical Finding: Placeholder Links REMOVED

On `main`, navigation pointed to dead `*-placeholder` routes. In the consolidated `release/v1-candidate`, **MCP-0G's fixes are included**:

| Old (main) | Consolidated | Status |
|------------|-------------|--------|
| `/seller/payouts-placeholder` | `/seller/payouts` | ✅ Fixed |
| `/seller/support-placeholder` | `/seller/support` | ✅ Fixed |
| `/admin/platform-health-placeholder` | `/admin/platform-health` | ✅ Fixed |

Verified: `grep "placeholder" lib/constants/navigation.ts` returns **nothing**.

---

## Duplicate Entries — None

No nav group lists the same destination twice. Each href is unique within its group.

## Missing Entries (capabilities not yet in nav)

Many MCP capabilities exist as routes but are not yet surfaced in the primary nav (reachable via deep links / sub-navigation):

| Capability | Route | In primary nav? |
|-----------|-------|-----------------|
| Discover | `/discover` | No (linked from home/search) |
| Nearby | `/nearby` | No (linked from location bar) |
| Rewards | `/rewards` | No (MCP-1D wired its own entry) |
| Seller operations/fulfillment/media/etc. | various | Partially (cockpit sub-nav) |
| Admin operations/intelligence/growth/etc. | various | Partially (admin sub-nav) |

**This is a navigation-surfacing gap, not a broken-link defect.** The routes work; they are reachable; some are not in the top-level menu. Surfacing them is an EC-2 UX task, explicitly out of EC-1 scope (no new UI).

## Broken / Conflicting Links — None

All 55 nav hrefs resolve to emitting routes. No conflicting destinations.

---

## Navigation Verdict

✅ **Consolidated navigation is coherent.** Zero placeholder links (MCP-0G fixes merged), zero duplicates, zero broken links. The only observation is that newer MCP capabilities are reachable but not all top-level-surfaced — a deliberate non-EC-1 concern.
