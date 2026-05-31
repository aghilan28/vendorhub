# MCP-0G.9 — Marketplace Polish Report

State coverage audited across the polish library and surfaces.

| State | Primitive | Coverage |
|---|---|---|
| Loading | `page-loader`, `dashboard-skeleton`, `table-skeleton`, `search-skeleton`, `skeleton-grid`, `ui/skeleton` | Root + **buyer/seller/admin group** `loading.tsx` (added in 0G) + per-screen skeletons |
| Empty | `feedback/empty-state` (`role="status"`) | Used in payouts, orders, notifications, vendor/product detail, etc. |
| Error | `feedback/error-state` + `app/error.tsx`, `(admin)/error.tsx`, `(buyer)/error.tsx`, `(seller)/error.tsx`, `app/not-found.tsx` | Group + root boundaries |
| Fallbacks | sample fallbacks with `sampled: true` labels (0E/0F) | Surfaces never show fake data as "live" |
| Toasts/Notifications | `components/ui/toast`, notification centers | Seller + admin notification screens |
| Success/failure/confirm flows | checkout review gate, payment plan steps, transition guards | 0F engine + surfaces |

## Improvements applied in 0G
- Added `(buyer)/loading.tsx`, `(seller)/loading.tsx`, `(admin)/loading.tsx` so
  every route group shows a consistent skeleton during navigation.
- Replaced the dead seller-support empty stub with a real, helpful surface.
- Consolidated misnamed `-placeholder` routes so users never land on a stub URL.

## Consistency checks
- Tone → badge variant mapping is uniform (`healthy/watch/degraded/critical`).
- Sampled vs live is always badge-labelled on intelligence/transaction surfaces.
- Currency formatting via `lib/formatting/currency` everywhere.

## Verdict
Loading, empty, error, fallback and confirmation states are present and
consistent. Score **9/10**.
