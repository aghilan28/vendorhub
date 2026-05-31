# MCP-0B.11 — Search Activation Report

## Every ingested product becomes searchable
- Generated/ingested products are published with `status='ACTIVE'`, which is
  exactly the filter the public query uses (`lib/api/queries/products.ts`:
  `.eq("status","ACTIVE")`). So population = searchability.
- The DB `search_document` tsvector is generated from name + description; the
  catalog engine's `buildSearchDocument` mirrors it (name + brand + category path
  + keywords + attributes) for parity with the vector embedding.
- Product create enqueues `ai.embedding.refresh`, so ingested products enter the
  pgvector index (`search_products_hybrid`).

## Search supports (existing engine + catalog metadata)
| Facet | Source |
|-------|--------|
| Category | taxonomy `categorySlug` / `rootSlug` filter |
| Brand | attribute + `ai_index_metadata.brand` |
| Variant | `product_variants.attributes` |
| Attributes | `filterableAttributes(category)` facets |
| Price | `base_price` + `price_delta` |
| Rating | `rating_average` |
| Availability | `inventory.stock_status` |
| Location | PostGIS geo feasibility (existing) |
| Intelligence ranking | pgvector hybrid + personalization (existing) |

## Quality improves with catalog growth
More categorized, attributed, embedded products → richer facets, better vector
neighbourhoods and stronger relevance signals. The 1,200-product seed makes
category/brand/facet search immediately meaningful; 10k–100k deepens it.

**Caveat:** vector ranking requires `OPENAI_API_KEY` + Supabase; without them the
keyword/`search_document` path still returns the ACTIVE catalog.
