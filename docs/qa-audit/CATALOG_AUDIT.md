# Catalog Audit

**Method:** Source code + schema review on `main`.
**Date:** 2026-05-31

---

## Component Scores

| Component | Status | Evidence |
|-----------|--------|----------|
| Categories | PARTIAL | `categories` table, `/categories` route, real query; no category images populated |
| Taxonomy | PARTIAL (main) | `lib/commerce-foundation/catalog.ts` (119 lines); `config/catalog/taxonomy.json` NOT on main (on MCP-0B branch) |
| Attributes | PARTIAL | Attribute handling in commerce-foundation; full attribute engine on branch |
| Variants | PARTIAL | `product_variants` table, variant code building; UI picker limited |
| Media/Images | PARTIAL | `product_images` table; `next.config` only whitelists `images.unsplash.com` — Supabase storage images would break in `next/image` on main |
| Video | MISSING | No video support in schema/UI |
| Bulk import | PARTIAL (branch) | MCP-1B import platform on unmerged branch; not on main |
| CSV | PARTIAL (branch) | CSV parsing on branch |
| Excel | MISSING | Consumed as CSV only (documented) |
| Catalog governance | PARTIAL | `lib/catalog-governance/engine.ts` (290 lines) real |
| Quality scoring | PARTIAL | Quality engine in catalog-governance; fuller on branch |
| SEO | MISSING | No sitemap, no robots.txt, no structured data/JSON-LD |
| Discovery | PARTIAL | `intelligent-product-grid`, category browsing |
| Searchability | PRODUCTION_READY | `listLiveProducts` filters `status=ACTIVE`, AI search, degrade-safe fallback |

---

## Scalability Assessment

| Product Count | Capability | Evidence |
|---------------|-----------|----------|
| 100 | ✅ Supported | Trivial; pagination via `getPaginationRange` |
| 1,000 | ✅ Supported | Real query with pagination, indexed columns |
| 10,000 | ✅ Supported | `phase_26_performance_scalability` migration adds indexes; pgvector for search |
| 100,000 | ⚠️ Conditional | Requires pgvector index tuning + connection pooling; modelled on branch, untested live |
| 1,000,000 | ⚠️ Conditional | Architecture supports it (Postgres + pgvector + CDN), but NO live test; needs read replicas, search index sharding |

---

## Critical Catalog Findings

1. **0 real products in the database** — the seed migration (1,200 products) is on the MCP-0B branch, not applied. Catalog is empty until seed runs.
2. **Image host misconfiguration** — `next.config.ts` only allows `images.unsplash.com`. Real seller-uploaded images (Supabase storage) would fail `next/image` optimization on main. This is a CONCRETE blocker for real catalog (fixed in MCP-0A branch).
3. **Taxonomy not on main** — `config/catalog/taxonomy.json` is absent; catalog category structure depends on the unmerged branch.
4. **No SEO** — no sitemap/robots/structured data; severe for organic product discovery.

---

## Verdict

**Catalog infrastructure is real and well-architected (taxonomy engine, quality scoring, pgvector search), but the catalog is EMPTY and the image pipeline is misconfigured on main.** Scale to 10K is credible; 100K-1M is architecturally plausible but unproven. The catalog cannot "look alive" until: (a) seed runs, (b) Supabase storage image host is whitelisted, (c) taxonomy branch is merged.
