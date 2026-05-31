# MCP-0B.2 — Master Commerce Taxonomy

Source: `config/catalog/taxonomy.json` (single source for the TS engine and the
seed script). Loaded + typed by `lib/catalog/taxonomy.ts`.

## Scale
- **27 root categories**, **97 total categories** (roots + subcategories).
- Roots: Groceries, Fruits, Vegetables, Dairy, Bakery, Snacks, Beverages,
  Household, Personal Care, Health, Beauty, Baby Care, Pet Care, Electronics,
  Mobiles, Computers, Accessories, Fashion, Footwear, Home, Kitchen, Furniture,
  Sports, Books, Automotive, Industrial, Office Supplies.

## Per-category metadata (every node)
| Field | Purpose |
|-------|---------|
| `attrFamily` | maps to an attribute template (Section MCP-0B.3) |
| `variantAxes` | allowed variant axes (Section MCP-0B.4) |
| `keywords` | search metadata (feeds `search_document`) |
| `parentSlug` / `depth` | hierarchy + breadcrumb / SEO path |

## Capabilities exposed
- `getCategory`, `isKnownCategory`, `rootSlugFor`, `childrenOf`, `categoryPath`.
- `rootCategories`, `leafCategories`, `taxonomyNodes`.

## Intelligence + SEO metadata
- Search metadata: per-category keywords + breadcrumb path build the search
  document (`searchdoc.ts`).
- SEO metadata: slug + category path enable canonical URLs and breadcrumbs.
- Intelligence metadata: `rootSlug` + `attrFamily` group products for category /
  demand / price intelligence.

Verified by tests: ≥27 roots, ≥90 nodes, root resolution (`smartphones→mobiles`).
