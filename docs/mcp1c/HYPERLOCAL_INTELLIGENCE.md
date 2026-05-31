# MCP-1C.12 — Hyperlocal Intelligence

**Engine:** `lib/hyperlocal/intelligence.ts`. Operates on stores / zones /
coverage cells (demand per pincode) + the delivery network.

## Generated (all mandated)
- **Coverage gaps** — pincodes with demand but no serviceable store
  (`coverage_gap`).
- **Demand hotspots** — high-demand pincodes with ≤1 store (`demand_hotspot`).
- **Expansion opportunities** — thin pincodes (`expansion`).
- **Delivery risks** — zones with low on-time rate (`delivery_risk`).
- **Zone risks** — overloaded zones (utilization ≥ 100%) (`zone_risk`).
- **Territory opportunities** — surfaced to sellers via the seller snapshot.
- **Location recommendations / marketplace expansion intelligence** — ranked
  `HyperlocalRecommendation[]` (by score).

## Integration
Shares the deterministic, ranked-by-score recommendation pattern used across
MCP-0E / 1A / 1B intelligence, so location recommendations can flow into the
same activation surfaces. Coverage cells expose `covered/thin/gap/hotspot`
status + a `coverageRate`.

## Exit criteria — met
Hyperlocal intelligence runs on real location entities and recommends concrete
coverage/expansion/delivery actions. (intelligence test.)
