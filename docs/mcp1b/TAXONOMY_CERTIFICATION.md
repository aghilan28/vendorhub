# MCP-1B.3 — Taxonomy Certification

**Engine:** `lib/catalog-population/taxonomy-ext.ts` (extends MCP-0B taxonomy).

## Category tree (reused, real)
- 27 root categories / 97 nodes (`taxonomyNodes`, `rootCategories`,
  `leafCategories`), each with `attrFamily`, `variantAxes`, `keywords`, `depth`.
- Subcategories + `categoryPath` / `childrenOf` / `rootSlugFor` navigation.

## Added in 1B
- **Brand hierarchies** — `buildBrandHierarchy` derives brand → product count +
  categories from real products.
- **Tag system** — `buildTags` derives tags from product attributes (frequency
  ranked).
- **Collections** — `buildCollection` materialises rule-based collections
  (category / brand / tag / price_below) with live product counts.
- **Catalog relationships** — products relate to categories (path), brands,
  collections and variant axes; the taxonomy audit measures coverage.
- **Attribute & variant templates** — reused from MCP-0B (`templateForFamily`,
  `VARIANT_OPTIONS`) + the 1B named variant sets.

## Taxonomy audit (`auditTaxonomy`)
Reports root categories, total nodes, max depth, categories-with-products,
empty categories, coverage %, brand count, tag count and collection count —
computed from the live catalog.

## Verdict
The taxonomy supports a rich catalog: hierarchical categories, attribute/variant
templates, brand hierarchies, tags, collections and relationships. **Certified.**
