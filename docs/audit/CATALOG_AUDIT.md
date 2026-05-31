# CATALOG AUDIT (Section 6)

## Schema (strong)
Catalog tables present in `supabase/migrations` (CREATE TABLE evidence):
`products`, `categories`, `subcategories`, `brands`, `product_variants`
(+`catalog_product_variants`), `product_images` (+`catalog_product_images`),
`inventory` (+`inventory_movements`, `inventory_reservations`,
`inventory_snapshots`, `inventory_velocity_snapshots`), `master_products`,
`product_families`, `product_aliases`, `product_duplicate_clusters`,
`product_quality_scores`, `product_validation_issues`, `reviews`, `review_votes`,
`geo_product_indexes`, `locality_product_scores`, `seasonal_product_boosts`,
`ai_product_matches`, `ai_image_analysis`.

This is an **enterprise-grade catalog data model** — well beyond a typical MVP.

## Runtime reality (partial)
| Capability | State | Evidence |
|------------|-------|----------|
| Product read | ✅ | `listLiveProducts`, `getLiveProductBySlug` with joins |
| Categories | ✅ | DB categories with filter |
| Brands | 🟡 | Table exists; no brand browse/admin UI verified |
| Subcategories | 🟡 | Table exists; UI shallow |
| Variants/SKUs | 🟡 | Selected in queries; **no variant management UI** |
| Attributes | 🟡 | `specs` JSON shown; no structured attribute system UI |
| Images | ❌ | metadata only; no upload (see IMAGE_PIPELINE_AUDIT) |
| Videos | ❌ | none |
| Metadata/SEO | 🟡 | slug + search_document; no per-product SEO/meta UI |
| Searchability | ✅ | `search_document` full-text + pgvector |
| Duplicate/quality governance | 🧪 | tables exist; runtime governance jobs partial |

## Ingestion reality
- Catalog is populated via **SQL seed migrations** (e.g.
  `south_indian_core_fmcg_kg_seed`, `fresh_produce_*_ingestion`,
  `tier4_hyperlocal_research_inventory_ingestion`), **not** via a self-serve
  ingestion/import tool. There is no bulk CSV/API catalog import UI.
- Seller create path exists (`createProductAction`) but lacks images.

## Maximum realistic catalog scale
- **Schema:** scales to large catalogs (indexes, pgvector, partitionable design,
  master/variant model) — capable of **hundreds of thousands+** rows in Postgres.
- **Practical ceiling today:** limited by (a) **no image pipeline**, (b) **no bulk
  ingestion UI**, (c) embedding cost/refresh throughput (per-product async job).
  Realistically demo-to-small-catalog (**hundreds–low thousands** of *complete*
  listings) until ingestion + images are built.

**Catalog score: 5/10** (excellent schema, weak ingestion/variants/images UI).
