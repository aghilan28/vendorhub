# M0 — Navigation Certification & UI Surface Certification (Sections 6 & 7)

## Part A — Navigation Certification (Section 6)

Evidence: `lib/constants/navigation.ts` (merged from K) and `app/(intelligence)/layout.tsx` which renders `DashboardSidebar items={intelligenceNavigation}`.

### A.1 Navigation graphs present
- **buyerNavigation** → Home, Search, Categories, Orders, Wishlist, Profile (+ cart/tracking quick actions).
- **sellerNavigation** → Dashboard, **Commerce Intelligence** (`/commerce-intelligence`), Products, Inventory, Orders, Analytics, Settings, Notifications, Payouts, Support.
- **intelligenceNavigation** → Command Center, Pricing Studio, Forecast Studio, Inventory Intelligence, Supply Intelligence, Routing & Fulfillment, Search Intelligence, Recommendations, Telemetry, + back-to-seller.
- **adminNavigation** → Dashboard, Vendors, Moderation, Orders, Refunds, Categories, Analytics, Notifications, Flags, Audit logs, Platform health, Settings.

### A.2 Reachability certification
| Required (directive Section 6) | Nav entry exists? | Reachable? |
|---|:--:|:--:|
| Commerce Intelligence Center | ✅ (seller + intel nav) | ✅ |
| Pricing Studio | ✅ intel nav | ✅ |
| Forecast Studio | ✅ intel nav | ✅ |
| Inventory Intelligence | ✅ intel nav | ✅ |
| Supply Intelligence | ✅ intel nav | ✅ |
| Routing Intelligence | ✅ intel nav | ✅ |
| Telemetry Intelligence | ✅ intel nav | ✅ |
| Search Intelligence | ✅ intel nav | ✅ |
| Recommendations | ✅ intel nav | ✅ |
| Simulation Studio | ❌ no page | n/a |
| SECIS Studio | ❌ no page | n/a |
| Research Center / Registry / Workflows | ❌ no page | n/a |
| Knowledge OS / Graph / Workflows | ❌ no page | n/a |
| Meta-Knowledge Center / Ontology Studio | ❌ no page | n/a |
| Governance Center / Policies / Decisions | ⚠️ admin moderation+audit only | partial |

### A.3 Orphan / hidden-route analysis
- **No orphaned pages** among existing surfaces: every `(intelligence)` page is listed in `intelligenceNavigation` and reachable via `DashboardSidebar`.
- **No hidden routes:** all 67 pages are either in a nav graph or are dynamic/detail children of a listed parent.
- **Unreachable systems:** the advanced-tier engines (T10–T15) have **no UI page**, therefore nothing to link. They are reachable only via API. This is a *build gap*, not a *navigation gap* — there is no page to orphan.

### A.4 Verdict
> **Navigation CERTIFIED for all existing surfaces.** The commerce-intelligence workspace is fully wired and reachable. Surfaces named in the directive that have no nav entry **have no underlying page on any branch**; they cannot be wired without building (out of scope for M0).

## Part B — UI Surface Certification (Section 7)

### B.1 Compile / render / route / reachable
| Surface group | Compiles? | Renders (HTTP 200)? | Routed? | Reachable via nav? |
|---|:--:|:--:|:--:|:--:|
| Marketplace (buyer) | ✅ | ✅ | ✅ | ✅ |
| Commerce Intelligence (9 pages) | ✅ | ✅ | ✅ | ✅ |
| Seller | ✅ | ⚙️ auth-gated | ✅ | ✅ |
| Admin/Operator | ✅ | ⚙️ auth-gated | ✅ | ✅ |
| Advanced Intelligence | ✅ (API) | 🔌 API only | ✅ | n/a (no page) |
| Knowledge / Research / Simulation / SECIS / Meta-Knowledge | n/a | ❌ no page | n/a | n/a |

All builds confirmed by `next build` (84+ routes, exit 0). Intelligence renders confirmed by live HTTP 200 probes and screenshots (Part C / `screenshots/`).

### B.2 Screenshots captured (integrated runtime)
14 PNGs in [`screenshots/`](screenshots/): marketplace-home, commerce-intelligence-center, pricing-studio, pricing-simulator, pricing-recommendations, forecast-studio, forecast-scenarios, forecast-comparison, inventory-intelligence, supply-intelligence, routing-intelligence, telemetry-intelligence, search-intelligence, recommendations. All HTTP 200, 1440×900 full-page.

### B.3 Not capturable (honest disclosure)
- Seller/admin surfaces: auth + Supabase gated (demo-safe mode) → render the gate, not the operator UI.
- Knowledge/Research/Simulation/SECIS/Meta-Knowledge: **no page exists** to capture.

### B.4 Verdict
> **UI surfaces CERTIFIED:** all existing pages compile, route, and (where not auth-gated) render at HTTP 200. The integrated platform exposes the marketplace + full commerce-intelligence workspace from one deployment.
