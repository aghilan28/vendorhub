# MCP-1B — Product Population Reality Audit (evidence-based, from code)

> Source of truth for this phase. Grounded in file paths verified on the MCP-1A
> tip (`feat/mcp1a-seller-activation`). Prior reports were not trusted.

## Verified starting state
- `tsc --noEmit` ✅ · `eslint .` ✅ (1 pre-existing warning) · `vitest` ✅ 393/45 · `next build` ✅ (pre-1B).
- Chain: 0A…0G + 1A complete. node_modules present.

## Capability classification

| Capability | Class | Evidence | 1B action |
|---|---|---|---|
| Catalog engine | **Real** | `lib/catalog/*` — taxonomy (97 nodes), attributes, variants, quality, dedup, searchdoc, ingestion, generator. | Reuse; extend with quality platform + discovery. |
| Media engine | **Real** | `lib/media/*` — storage, processing, quality, dedup, moderation, gallery, and `bulk.ts` (manifest parse + batched ingestion + progress + resume). | Reuse; extend into a media population engine. |
| Import engine | **Partial** | `lib/seller-activation/population.ts` (1A) imports CSV/JSON over `analyzeImport` synchronously — no chunking/queue/retry/monitoring/analytics for large files. | Build Import Platform V2 (chunked/queued, 50k+). |
| Category / taxonomy system | **Real (basic)** | `lib/catalog/taxonomy.ts` (tree, attrFamily, variantAxes, keywords). No collections, brand hierarchy, tags, product relationships. | Extend taxonomy (collections/brands/tags/relationships). |
| Search | **Real (env-gated)** | hybrid AI search + `buildSearchDocument`; `/search`, `/categories`. | Audit discovery readiness + faceting engine. |
| Product variants | **Real (basic)** | `lib/catalog/variants.ts` — capped cartesian over 9 axes. | Expand to named variant sets + variant intelligence. |
| Seller upload / bulk upload | **Partial** | 1A `/seller/import` (synchronous CSV). `/seller/catalog` (0B bulk). | Add seller catalog operations + import V2 dashboard. |
| Catalog moderation | **Partial** | `admin/moderation/products` exists; no catalog quality/duplicate/media governance queues. | Build admin catalog governance. |
| Duplicate detection | **Real** | `lib/catalog/dedup.ts` (exact/near/SKU). | Reuse in duplicate-risk + governance. |
| Quality scoring | **Real (per-product)** | `scoreCatalogQuality` + `qualityBand`. | Aggregate into a catalog quality platform. |
| Product universe scaling | **Real (engine)** | `validateUniverseScale` (1A) over `generateCatalog`; unit-tested at 10k. | Certify 10k/100k/1M capacity + pagination/index reasoning. |

## Reuse map (do NOT rebuild)
`lib/catalog` (ingestion/generator/variants/quality/dedup/searchdoc/taxonomy),
`lib/media` (bulk/quality/dedup/processing), `lib/seller-activation`
(population/operations/intelligence), `lib/marketplace-intelligence` (recommendation).

## What MCP-1B builds (`lib/catalog-population/`)
A deterministic engine on real shapes (`CatalogProductInput`, `GeneratedProduct`,
`ImportReport`): **Import V2** (chunked/queued/retry/monitoring/analytics, 50k+),
**media population** (bulk plan + quality/dedup/compression/thumbnail/analytics
over 0A), **variant expansion** (named variant sets + variant intelligence),
**catalog quality platform** (health/quality/media/completeness/duplicate-risk +
recommendations + governance), **discovery readiness** (facets/filters/sort/
coverage), **taxonomy extensions** (collections/brands/tags/relationships),
**seller catalog operations**, **admin catalog governance** (6 queues), and
**population intelligence** (gaps/coverage/forecasts).

## Honest scope
No live DB in the sandbox; live reads degrade to clearly-labelled samples
(`sampled: true`). Chunked/background imports are modelled deterministically
(plan + queue state machine + progress/analytics); the actual async worker
execution is the existing queue infra's job. Byte-level image transforms
(compress/thumbnail) are planned deterministically and executed by the 0A async
worker.
