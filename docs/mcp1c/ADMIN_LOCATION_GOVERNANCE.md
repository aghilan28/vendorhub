# MCP-1C.11 — Admin Location Governance

**Engine:** `buildAdminLocationSnapshot` · **Surface:** `/admin/location`.

## What the admin governs (all mandated)
- **Location / store coverage dashboard** — stores, coverage rate, serviceable
  pincodes.
- **Delivery dashboard** — network utilization, orders/capacity, health.
- **Zone dashboard** — per-zone utilization, on-time, courier, stores.
- **Territory dashboard** — zone coverage cells (covered/thin/gap/hotspot).
- **Capacity dashboard** — overloaded-zone count + utilization.
- **Hyperlocal intelligence** — coverage gaps, demand hotspots, expansion, zone
  risks (ranked recommendations).
- **Marketplace coverage dashboard** — serviceable vs total pincodes + coverage %.
- **Expansion dashboard** — expansion recommendations.
- **Location Governance Center** — the `/admin/location` surface (Zones /
  Coverage / Intelligence tabs).

## Exit criteria — met
The admin governs marketplace geography end to end. (assembler test.)
