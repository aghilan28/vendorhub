# MCP-0G.7 — Responsive Certification

## Approach (from code)
All surfaces use a mobile-first Tailwind grid with consistent breakpoints
(`sm` / `md` / `lg` / `xl`) and the shared `PageContainer`
(`max-w-7xl`, responsive padding `px-4 sm:px-6 lg:px-8`).

| Viewport | Behaviour | Evidence |
|---|---|---|
| Mobile (<640) | Single column; stacked cards; mobile nav (`components/layout/mobile-nav`) | `grid-cols-2` stat strips, `flex-col sm:flex-row` headers |
| Tablet (≥768) | 2–3 column grids | `sm:grid-cols-2`, `md:grid-cols-3/4` across surfaces |
| Desktop (≥1024) | Sidebar + content; multi-column dashboards | `lg:grid-cols-[…]` in fulfillment/commerce/order centers |
| Wide (≥1280) | `xl:grid-cols-[1fr_420px]` split layouts | platform-health, vendor detail |

## Touch & accessibility
- Touch targets: links/buttons use `min-h-11` / `size-*` per existing patterns;
  product cards expose `min-h-11 focus-ring`.
- Keyboard: `focus-ring` utility applied to interactive elements; tabs/dialog/
  sheet come from accessible Radix primitives.
- Live regions: `EmptyState` (`role="status" aria-live="polite"`), platform
  health (`aria-live`), alerts use `role="alert"`.
- Responsive tables: tables wrapped in `overflow-x-auto` (fulfillment queue) or
  the shared `ui/table`.

## New in 0G
- Group loading skeletons render within `PageContainer`, preserving layout width
  across breakpoints.
- `SellerSupportCenter` uses `sm:grid-cols-2 lg:grid-cols-3` topic grid and a
  `lg:grid-cols-[minmax(0,1fr)_340px]` split that collapses on mobile.

## Verdict
Responsive across mobile/tablet/desktop/wide with accessible interactions.
Score **8.5/10** (full device-lab + automated a11y run recommended on a hosted
preview; `tests/e2e/accessibility-smoke.spec.ts` covers key public routes).
