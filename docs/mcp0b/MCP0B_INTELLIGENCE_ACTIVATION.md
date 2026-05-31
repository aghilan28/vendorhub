# MCP-0B.12 — Intelligence Activation Report

Catalog data is not isolated — it feeds the Commerce Intelligence layer.

| Intelligence | Catalog input | Status |
|--------------|---------------|--------|
| Demand forecasting | category/root grouping + inventory rows | ✅ data shape ready |
| Inventory forecasting | `inventory` stock/status per product/variant | ✅ |
| Price intelligence | `base_price` + `price_delta` + brand/category | ✅ |
| Product performance | quality score + status + (orders) | ✅ quality wired |
| Category intelligence | `rootSlug`/`attrFamily` grouping + distribution | ✅ `catalogDistribution` |
| Marketplace intelligence | coverage, quality, duplicate metrics | ✅ admin snapshot |

## Integration points
- Generated/ingested products carry `qualityScore`, `brand`, `rootSlug` in
  `ai_index_metadata` for grouping and scoring.
- Embedding refresh on create connects catalog → vector intelligence.
- Admin Catalog Center exposes catalog distribution + quality, the inputs
  category/marketplace intelligence consume.

No isolated catalog: the same deterministic-engine + governable-table pattern
used across the platform applies, so intelligence can operate on catalog data.
