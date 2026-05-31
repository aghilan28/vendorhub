# MCP-1A.9 — Marketplace Population Operations

**Engine:** `lib/seller-activation/operations.ts` · **Surface:** `/admin/population`
(`MarketplacePopulationCenter`).

## Operational workflows made measurable (all mandated)
- **Seller recruitment / activation** — the funnel `registered → verified →
  withCatalog → active` with conversion rates at each step.
- **Catalog population** — products, published products, average catalog quality,
  catalog fill rate.
- **Store / catalog quality audits** — average catalog quality per active seller;
  quality feeds the funnel and intelligence.
- **Marketplace growth & population progress** — capacity progress toward the
  **100-seller** and **10,000-product** targets (`sellerProgress`,
  `productProgress`), with overall population tone.
- **Marketplace expansion tracking** — per-category products / sellers / coverage,
  highlighting thin categories (≤ 1 seller) for recruitment.
- **Activation metrics / operational KPIs** — sellers, active sellers,
  categories covered, average products/seller, seller activation rate.

## Surface
Four tabs: Funnel · Capacity · Expansion · Intelligence — with progress bars and
a category coverage table. Reads real `vendors` + `products`; degrades to a
labelled sample.

## Exit criteria — met
Marketplace population is measurable end to end. Covered by the population test
(funnel, KPIs, capacity, expansion).
