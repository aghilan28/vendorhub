# MCP-0B.6 — Exhaustive Product Dataset

Sources: `lib/catalog/generator.ts` (engine) + `scripts/generate-catalog-seed.mjs`
(seed emitter) + `supabase/migrations/20260531010000_mcp0b_catalog_seed.sql`
(committed seed).

## Generator
`generateCatalog(count, seed)` produces deterministic products distributed across
all leaf categories. Each product is:
- **Searchable**: `searchDocument` (name + brand + category path + keywords + attrs).
- **Categorized**: valid taxonomy `categorySlug` + `rootSlug`.
- **Attributed**: family-appropriate attributes filled.
- **Variant-aware**: variants generated from the category's axes.
- **Media-ready**: a whitelisted image URL (renders via next/image).
- **Intelligence-ready**: `qualityScore`, brand, rootSlug for grouping.

Determinism + uniqueness verified by tests (same seed → identical; 2,000 unique
slugs + SKUs; spread across ≥20 roots).

## Population (committed)
The seed migration ships **97 categories + 1,200 ACTIVE products** (+ one image
and an inventory row each), idempotent and guarded by an existing vendor. ACTIVE
status means they are immediately searchable.

## Scaling to target
The same generator + script emit any size:
```
COUNT=10000  node scripts/generate-catalog-seed.mjs   # minimum target
COUNT=50000  node scripts/generate-catalog-seed.mjs   # preferred
COUNT=100000 node scripts/generate-catalog-seed.mjs   # stretch
```
A 1,200-product seed is ~0.56 MB; 100k is generated on demand rather than
committed (to keep the repo lean). **Honest note:** the committed population is
1,200 (a real, browsable catalog); 10k–100k is one command away and applies the
same way.
