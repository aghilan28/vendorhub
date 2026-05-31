# MCP-0C.5 — Pricing Command Center

Engine: `lib/seller-os/pricing.ts` · UI: Pricing tab.

## Capabilities
- **Price management** + **bulk pricing** (Seller Catalog Ops, MCP-0B).
- **Margin monitoring**: per-product margin %, below-threshold count.
- **Price optimization**: recommendation per product — `raise` (high demand + low
  stock, or below-margin), `discount` (no sales + high stock), or `hold` — each
  with a rationale.
- **Sale / scheduled pricing**: `Promotion` (promotions center) + price validation.
- **Competitor pricing fields / dynamic hooks / revenue simulation hooks**:
  MRP + margin fields and `validatePriceChange` provide the hook points; dynamic
  pricing plugs into the recommendation output.
- **Price history**: backed by product `updated_at` + audit.

`validatePriceChange` blocks non-positive prices and price > MRP.

Verified by tests: discount recommendation for stagnant high-stock; validation.
