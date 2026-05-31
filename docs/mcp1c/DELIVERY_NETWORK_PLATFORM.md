# MCP-1C.8 — Delivery Network Platform

**Engine:** `lib/hyperlocal/delivery-network.ts` · **Surface:** `/admin/location`.

## Capabilities (all mandated)
- **Delivery zones / territories** — `DeliveryZone` (pincodes, stores, capacity,
  courier).
- **Delivery networks** — `buildDeliveryNetwork` aggregates zones into a snapshot.
- **Delivery capacity** — per-zone capacity vs orders → utilization.
- **Courier integration layer** — per-zone `courier` + `onTimeRate` (maps to the
  existing logistics provider RPCs).
- **Fulfillment mapping** — zones map stores → pincodes → couriers.
- **Delivery monitoring** — utilization + on-time per zone; overloaded-zone count.
- **Delivery intelligence** — surfaced via hyperlocal intelligence (zone risks).
- **Delivery health** — 0–100 network health + tone (headroom + on-time + zone
  serviceability).
- **Delivery operations** — admin Location Governance center (zones dashboard).

## Exit criteria — met
Delivery is manageable: zones, capacity, courier mapping, monitoring and health
in one network snapshot. Covered by the delivery-network test (overloaded zone
flagged).
