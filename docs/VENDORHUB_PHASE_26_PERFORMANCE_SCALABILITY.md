# VendorHub Phase 26 Performance + Scalability

Status: implemented performance layer for cache policy, DB hot paths, realtime coalescing, AI retrieval reuse, dashboard load control, and benchmark thresholds.

## Audit Findings

- Seller and admin subviews were fetching full snapshots independently, creating duplicate dashboard payloads.
- Realtime already had tab leadership, but passive-tab events could still invalidate broad query families too often.
- AI retrieval rebuilt embeddings and hydrated the same product candidates across bursty equivalent searches.
- Product, order, notification, checkout, delivery, geo, and moderation queries needed composite and partial indexes for predictable growth.
- Dashboard APIs had no deterministic short cache headers or server timing.

## Implemented Optimizations

- Centralized performance budgets and cache policy in `lib/performance`.
- Added short server-side request caches for seller/admin snapshots and AI retrieval bursts.
- Reused TanStack snapshot queries with `select` to avoid duplicate network requests per subview.
- Added realtime event coalescing, duplicate tracking, narrower invalidation routes, and bounded event memory.
- Added pgvector ANN index creation when embeddings exist, PostGIS geo pruning helpers, and commerce hot-path indexes.
- Added performance observability event table and RPC for latency/cache/payload tracking.
- Added `scripts/phase26-performance-load.mjs` for repeatable endpoint p95 checks.

## Production Thresholds

- API p95: 450 ms
- Checkout p95: 900 ms
- AI retrieval p95: 800 ms
- Realtime propagation p95: 1200 ms
- Hydration p95: 1800 ms
- Cache hit ratio warning floor: 72%
- Realtime payload warning ceiling: 4096 bytes

## Verification

- Unit coverage: cache bounds, cache dedupe, and budget invariants.
- Typecheck/build should remain the release gate.
- Load script requires a running app and realistic auth/session data for protected seller/admin endpoints.
