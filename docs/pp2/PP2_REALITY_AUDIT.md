# PP2_REALITY_AUDIT

**Program:** VendorHub Product Population — Wave 1 (PP-2): Brand Universe Foundation & Brand Intelligence
**Method:** Source-code audit only. Prior reports were not trusted; migrations, `lib/`, `types/`,
`app/` and `features/` were inspected directly.
**Audited ref:** branch `pp2-brand-universe` (cut from `pp1-taxonomy-foundation`, which carries PP-1).

---

## 0. Headline

A minimal `public.brands` table exists (from `tier_1_commerce_foundation.sql`, pre-PP-1). There is
**no brand engine, no company/ownership model, no alias system, no brand governance, no
brand↔taxonomy classification, and no brand search/recommendation/intelligence readiness**. PP-2
builds the canonical brand system as a new `lib/brands/` layer + additive migration, **on top of**
PP-1 (`lib/taxonomy`) and **without modifying** it.

---

## 1. Subsystem classification (REAL / PARTIAL / MISSING)

| # | Subsystem | Status | Evidence |
|---|---|---|---|
| 1 | Brand tables | **PARTIAL** | `public.brands` (slug, canonical_name, manufacturer, origin_region, country_code, aliases[], is_local_brand, metadata) — a flat anchor only |
| 2 | Taxonomy↔brand relationships | **MISSING** | no brand→taxonomy mapping table or code; `master_products.brand_id` links products, not brands→categories |
| 3 | Catalog brand structures | **PARTIAL** | `master_products.brand_id` references a brand; no canonical brand catalog model |
| 4 | Seller brand structures | **MISSING** | no seller↔brand authorization/links found |
| 5 | Recommendation dependencies | **MISSING** | `lib/ai/recommendation-engine.ts` consumes products; no brand affinity/substitution |
| 6 | Search dependencies | **PARTIAL** | `brands.aliases[]` exists; no brand search projection / synonym / misspelling handling |
| 7 | Intelligence dependencies | **MISSING** | no brand demand/share/growth/risk hooks |
| 8 | Analytics dependencies | **MISSING** | no brand aggregation buckets |
| 9 | PP-1 taxonomy integration points | **REAL (available)** | `lib/taxonomy` exports `TaxonomyEngine`, `buildCanonicalTaxonomyEngine`, `slugify`, `createDeterministicClock` — ready to consume |

**Summary:** 1 REAL (PP-1 integration surface), 3 PARTIAL, 5 MISSING.

---

## 2. Constraints captured for the build

- **Do not modify/duplicate PP-1.** Reuse `slugify`, `createDeterministicClock`, and `TaxonomyEngine`
  from `@/lib/taxonomy`. Brand classification validates department/category slugs against a real
  taxonomy engine.
- **Additive, idempotent migration** (per `scripts/ops-migration-audit.mjs`): no destructive ops;
  every object-creating statement guarded with `if not exists` / `do $$ … exception when duplicate_object`.
  Reuse existing `public.set_updated_at()` and `public.current_user_has_role()`.
- **Avoid table-name collision** with the existing `public.brands`: PP-2 introduces a canonical
  `brand_universe` table (source of truth) plus `brand_companies`, `brand_ownership`, `brand_aliases`,
  `brand_taxonomy_links`, `brand_audit_log`, `brand_change_requests`.
- **Determinism:** path/slug-derived IDs and an injectable deterministic clock; no `Date.now()` /
  `Math.random()` in core logic.

---

## 3. Decision

Build `lib/brands/` (brand engine, company engine, validation, governance, classification, and
search/recommendation/intelligence projections) + a canonical universe of 1000+ real brands mapped
to PP-1 taxonomy + an additive migration + deterministic tests + scale certification + docs. Create
**no products, inventory, or sellers.**
