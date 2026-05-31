# MCP-0B.1 — Catalog Reality Audit (Baseline)

Source-of-truth audit before this phase (re-verified against the repo).

| Dimension | Before MCP-0B | Evidence |
|-----------|---------------|----------|
| Product read layer | ✅ real | `lib/api/queries/products.ts` (`status='ACTIVE'`, joins, full-text) |
| Category schema | ✅ | `public.categories` (self-referencing, slug unique) |
| Brand schema | ✅ | `public.brands` (catalog-governance) |
| Variant schema | ✅ | `public.product_variants` (sku, attributes jsonb, price_delta) |
| Inventory schema | ✅ | `public.inventory` (stock, status, reservations) |
| Media | ✅ (MCP-0A) | upload pipeline + gallery + governance shipped in MCP-0A |
| Search | ✅ engine | pgvector hybrid + `search_document`; env-gated |
| **Live product population** | ❌ empty | only SQL seeds; no taxonomy/ingestion/generation; marketplace empty without manual seeding |
| **Master taxonomy** | ❌ missing | no canonical category tree / attribute templates / variant rules |
| **Ingestion** | ❌ missing | no CSV/JSON/bulk import + validation + dedup + quality |
| **Catalog quality** | ❌ missing | no per-product quality score |
| **Duplicate detection (products)** | ❌ missing | only media-hash dedup existed |

## Verdict (before)
Catalog **infrastructure existed**, but there was **no catalog reality**: no
master taxonomy, no attribute/variant engines, no ingestion, no quality/dedup,
and no large population. The marketplace was "an empty database" without manual
SQL seeding.

## What MCP-0B delivers
A complete catalog engine (`lib/catalog/`), a master taxonomy (97 categories), an
attribute + variant engine, an ingestion platform (CSV/JSON/bulk + validate +
dedup + quality), a deterministic generator scaling to 100k+, a committed
1,200-product ACTIVE seed, admin/seller catalog surfaces, and search/intelligence
activation. See the remaining MCP-0B documents.
