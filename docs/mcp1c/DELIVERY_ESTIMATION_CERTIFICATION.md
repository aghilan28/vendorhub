# MCP-1C.7 — Delivery Estimation Certification

**Engine:** `lib/hyperlocal/delivery-estimation.ts` (reuses lib/geo `distanceKm`).

## Computes (all mandated)
- **ETA** — fulfillment + travel + operational + marketplace minutes.
- **Delivery window** — ±20% around ETA (min ±6 min) → start/end.
- **Delivery confidence** — `100 − delayRisk`.
- **Delay risk** — utilization over 70% + low fulfillment rate + edge-of-radius.
- **Fulfillment time** — store fulfillment promise.
- **Travel time** — distance ÷ 22 km/h urban courier speed + handling.
- **Operational time** — queueing from store utilization.
- **Marketplace time** — routing/assignment overhead.

## Guarantees
- ETA equals the sum of the breakdown components (asserted in tests).
- `confidence + delayRisk = 100`.
- No location → null ETA + a clear prompt.

## Exit criteria — met
Buyers see realistic, explainable delivery promises (a window, confidence and a
component breakdown). **Certified.** (delivery-estimation test.)
