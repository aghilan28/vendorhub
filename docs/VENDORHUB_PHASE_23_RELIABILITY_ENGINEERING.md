# VendorHub Phase 23 Reliability Engineering

Phase 23 adds the reliability evidence layer around VendorHub's critical commerce paths.

## Gates

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run test:e2e`
- `npm run reliability:load`

## Critical Coverage

- Pricing, GST, delivery fee, and discount invariants.
- Order lifecycle transitions, audit entries, and buyer notifications.
- Payment rate limiting and duplicate pressure.
- Checkout contention, idempotency, and rollback simulation.
- Webhook replay storm deduplication.
- Realtime reconnect storm channel bounding.
- AI fallback, multilingual search, and out-of-stock recommendation exclusion.
- Geo radius correctness and invalid coordinate handling.
- Observability redaction, alert thresholds, and diagnostics API envelopes.
- Browser E2E smoke for operational health and accessibility landmarks.

## Failure Simulation

The deterministic failure simulator in `tests/utils/failure-simulator.ts` models the failure modes that are too risky or slow to reproduce against production dependencies:

- inventory lock contention
- payment timeout after inventory lock
- duplicate checkout idempotency keys
- webhook replay storms
- realtime reconnect floods
- injected DB, payment, AI, and network failures

## Load Thresholds

`scripts/reliability-load.mjs` defaults:

- target: `http://127.0.0.1:3000`
- concurrency: `8`
- iterations: `24`
- p95 latency threshold: `1500ms`

Override with `RELIABILITY_TARGET_URL`, `RELIABILITY_CONCURRENCY`, `RELIABILITY_ITERATIONS`, and `RELIABILITY_MAX_P95_MS`.
