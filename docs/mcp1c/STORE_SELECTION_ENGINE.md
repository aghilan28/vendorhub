# MCP-1C.6 — Store Selection Engine

**Engine:** `lib/hyperlocal/store-selection.ts`.

## Multi-factor ranking (all mandated factors)
`selectStore` ranks stores using weighted factors (each 0..1):
- **Distance** (0.30) — closer is better (reuses lib/geo `distanceKm`).
- **Inventory** (0.20) — in-stock gate.
- **Seller rating** (0.10).
- **Trust score** (0.12).
- **Delivery capacity** (0.10) — headroom vs orders today.
- **Fulfillment health** (0.13).
- **Price** (0.05) — normalized; lower is better.

Commerce-intelligence signals (rating/trust/fulfillment) come from the
0D/0E/1A engines. Weights are overridable.

## Gates
Non-serviceable stores are penalised ×0.25; out-of-stock ×0.2 — so the
auto-selected `best` store is the top serviceable, in-stock match.

## Output
`{ best, ranked, evaluated, serviceable }` — `best` is auto-selected.

## Exit criteria — met
The best store is automatically selected via deterministic multi-factor scoring.
Covered by the store-selection test (ranked desc, gates applied).
