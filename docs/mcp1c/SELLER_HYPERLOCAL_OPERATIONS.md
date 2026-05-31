# MCP-1C.10 — Seller Hyperlocal Operations

**Engine:** `buildSellerHyperlocalSnapshot` · **Surface:** `/seller/hyperlocal`.

## What the seller receives (all mandated)
- **Coverage map** — service radius, coverage area (km²), zones.
- **Delivery radius** — `serviceRadiusKm`.
- **Delivery health** — 0–100 (fulfillment rate + capacity headroom + availability).
- **Zone analytics** — per-zone utilization, on-time, courier, orders/capacity.
- **Hyperlocal demand** — coverage cells (demand per pincode) from intelligence.
- **Delivery intelligence** — territory/coverage opportunities + zone risks.
- **Territory & expansion opportunities** — coverage-gap / demand-hotspot alerts.
- **Location & capacity alerts** — severity-ranked alerts.
- **Daily hyperlocal briefing** — human-readable status lines.

## Exit criteria — met
The seller manages locality operations: coverage, radius, zone analytics, demand
and expansion opportunities. (assembler test.)
