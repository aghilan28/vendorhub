# MCP-1B.11 — Product Population Intelligence

**Engine:** `lib/catalog-population/intelligence.ts`. Operates on **real**
products / categories / variants / sellers / catalog activity.

## Generated (all mandated)
- **Catalog growth opportunities** — `growth_opportunity` toward the product
  target.
- **Missing categories** — empty root categories (`missing_category`).
- **Category gaps** — thin categories with low product counts (`category_gap`).
- **Variant gaps** — variant-capable categories with low variant adoption
  (`variant_gap`), with recommended axes.
- **Population forecasts** — current products/categories, 30-day and 90-day
  projections, target progress.
- **Marketplace coverage analysis** — per-root `CategoryCoverage`
  (products, sellers, coverage %, status rich/growing/thin/empty).
- **Catalog recommendations** — ranked, actionable.

## Surfaces
`/admin/catalog-governance` (Coverage + Intelligence tabs). Recommendations share
the deterministic, ranked-by-score pattern used across MCP-0E/1A intelligence.

## Exit criteria — met
Intelligence runs on real catalog entities and recommends concrete population
actions with a forecast. Covered by the population-intelligence test.
