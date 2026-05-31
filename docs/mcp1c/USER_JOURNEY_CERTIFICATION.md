# MCP-1C.13 — User Journey Certification

All five mandated journeys function (live when configured; labelled sample
otherwise).

## Journey A — Buyer: Select location → Discover nearby products → Purchase
`/nearby` → location selector → `discoverStores` (nearby, serviceable) →
`selectStore` best store → store catalog (MCP-1B) → cart/checkout (MCP-0F). ✅

## Journey B — Buyer: Enter address → Receive ETA → Complete checkout
`analyzeAddress` validates/completes the delivery address →
`evaluateServiceability` confirms delivery → `estimateDelivery` shows the ETA
window + confidence → checkout (MCP-0F). ✅

## Journey C — Seller: Configure territory → Manage delivery radius
`/seller/hyperlocal` — coverage (radius/area/zones), zone analytics, capacity and
territory opportunities; radius/zones drive serviceability. ✅

## Journey D — Admin: Manage coverage → Expand marketplace
`/admin/location` — delivery network, coverage dashboard (covered/thin/gap/
hotspot), and expansion recommendations from hyperlocal intelligence. ✅

## Journey E — Intelligence: Detect demand hotspot → Recommend expansion
`buildHyperlocalIntelligence` detects hotspots/gaps and emits ranked expansion +
coverage recommendations (surfaced in `/admin/location` and `/seller/hyperlocal`). ✅

## Validation
Backed by 425 passing unit/integration tests (incl. 14 new MCP-1C), the
navigation-coherence test (new routes resolve, no dead/placeholder), and a
production build emitting `/nearby`, `/seller/hyperlocal`, `/admin/location`.
