# MCP-1B.8 — Discovery Readiness Report

**Engine:** `lib/catalog-population/discovery.ts`.

## Audited dimensions (all mandated)
- **Searchability** — `searchCoverage` = % of products with a non-empty
  `buildSearchDocument` (feeds pgvector hybrid + keyword search). Generated
  catalog is **100% searchable**.
- **Filtering / Faceting** — `buildFacets` produces category, brand, price-bucket
  and top filterable-attribute facets with counts.
- **Sorting** — `SORT_OPTIONS` (relevance, price asc/desc, newest, rating,
  popularity).
- **Navigation / Collections** — root-category coverage + collection count from
  the taxonomy extensions.
- **Recommendations** — discovery gaps (missing brand facet, no filterable
  attributes, no collections, products without search documents).

## Readiness score
`assessDiscoveryReadiness` → 0–100 (search coverage 50% + facet richness 30% +
category coverage 20%) + tone + gap list.

## Verdict
Products can be found: searchable, faceted, filterable, sortable and navigable.
Gaps (e.g. missing collections) are surfaced as actionable items. Covered by the
discovery test.
