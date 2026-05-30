# Deliverable 6 — Visual Product Catalog

**Section 5 of the directive.** Screenshots captured from the **running production build** (`next start` @ `http://localhost:3100`) of the certified branch `phase-l-finalization`, via Playwright/Chromium 1.60.0, 1440×900, full-page. Capture script: [`scripts/baseline-screenshots.mjs`](../../scripts/baseline-screenshots.mjs).

## 6.1 Captured surfaces (real screenshots, HTTP 200)

All images live in [`docs/baseline/screenshots/`](screenshots/).

| Surface | Route | File | HTTP |
|---|---|---|:--:|
| Marketplace (home) | `/` | `screenshots/marketplace-home.png` | 200 |
| Marketplace (home alt) | `/home` | `screenshots/home.png` | 200 |
| Categories | `/categories` | `screenshots/categories.png` | 200 |
| Cart | `/cart` | `screenshots/cart.png` | 200 |
| Checkout | `/checkout` | `screenshots/checkout.png` | 200 |
| Search | `/search` | `screenshots/search.png` | 200 |
| Wishlist | `/wishlist` | `screenshots/wishlist.png` | 200 |
| Sign in | `/sign-in` | `screenshots/sign-in.png` | 200 |
| Sign up | `/sign-up` | `screenshots/sign-up.png` | 200 |
| Seller registration | `/seller-registration` | `screenshots/seller-registration.png` | 200 |
| Launch | `/launch` | `screenshots/launch.png` | 200 |
| Demo | `/demo` | `screenshots/demo.png` | 200 |
| Offline (PWA) | `/offline` | `screenshots/offline.png` | 200 |

## 6.2 Surfaces requested by the directive that COULD NOT be captured

Honest disclosure — these were requested but are not capturable from the certified branch:

| Requested surface | Reason not captured |
|---|---|
| Seller dashboard/inventory/analytics; Admin moderation/vendors/analytics | Render behind authentication + Supabase session; the secret-less certification host returns the auth gate, not the operator UI. Routes exist and build (see `03`), but a logged-in capture requires seeded auth + DB. |
| Commerce Intelligence Center, Pricing Studio, Forecast Studio, Inventory Intelligence, Supply Intelligence, Routing, Telemetry | **Not present on the certified branch.** These pages exist only on `origin/phase-k/commerce-intelligence-productization` (`app/(intelligence)/*`). Cannot screenshot what is not in the tree. |
| Simulation Studio, SECIS Studio, Research Center, Intelligence Center, Knowledge OS, Meta Knowledge Center, Governance Center | **No page exists on any branch.** These are backend modules (`lib/tier10–15`) + introspection APIs (`/api/tier10`, `/api/tier14`, `/api/tier15`) + docs only. There is no UI to capture. |

## 6.3 Verdict

> The Visual Product Catalog **fully documents the realized, public commerce product** (13 surfaces, real PNGs). It **cannot** present the advanced "studio/center" surfaces because, on the certified line, **they have no UI** — and the commerce-intelligence studios are unmerged on Phase K. This is itself a primary certification finding: the visual catalog is bounded by the realization gap, not by capture tooling.

To produce a complete visual catalog, two preconditions must be met first (both out of scope for this read-only baseline): (1) merge Phase K to bring the intelligence surfaces into the tree, and (2) provide a seeded auth + Supabase test environment to capture operator/admin/seller surfaces.
