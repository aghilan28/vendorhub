# MCP-1C.9 — Buyer Hyperlocal Experience

**Surface:** `/nearby` (`BuyerHyperlocal`), reusing `/discover`, `/search`,
`/categories`, `/store/[slug]`.

## What the buyer gets (all mandated)
- **Location selector** — pick a delivery location (presets); engine recomputes live.
- **Nearby stores** — `discoverStores` (distance-sorted, within search radius).
- **Nearby products** — store catalogs (from MCP-1B) filtered by serviceable stores.
- **Hyperlocal search / categories** — reuse `lib/hyperlocal-discovery` + catalog.
- **Nearby recommendations** — best-store auto-selection (`selectStore`).
- **Availability indicators** — in-stock / out-of-stock per store.
- **Delivery indicators** — `estimateDelivery` window + confidence.
- **Serviceability indicators** — `evaluateServiceability` status + reason.
- **ETA indicators** — delivery window label per store.
- **Location-based personalization** — ranking responds to the chosen location.

## Exit criteria — met
The buyer experiences local commerce: choose a location, see nearby serviceable
stores with ETA + confidence, and the best store auto-selected.
