# PP2_BRAND_ARCHITECTURE

**Program:** VendorHub Product Population — Wave 1 (PP-2)
**Deliverable:** Brand Universe Foundation & Brand Intelligence System (`lib/brands/`)
**Status:** Built, validated, certified. No products / inventory / sellers created. PP-1 untouched.

---

## 1. Module map (`lib/brands/`)

| Module | Responsibility |
|---|---|
| `types.ts` | Brand / Company models, status + verification + industry enums, validation/governance types |
| `engine.ts` | `BrandEngine` + `CompanyEngine` (ownership traversal), `resolveBrands`/`resolveCompanies` |
| `classification.ts` | `BrandClassification` — brand ↔ PP-1 taxonomy mapping + bidirectional lookups (Phase 4) |
| `validation.ts` | `validateBrandUniverse` integrity engine (Phase 10) |
| `governance.ts` | `BrandGovernance` — create/edit/merge/archive/restore/verify/reject/deprecate + audit + approval (Phase 5) |
| `search.ts` | Brand search-readiness projection incl. company synonyms/aliases (Phase 6) |
| `recommendation.ts` | Brand affinity / substitution / similarity readiness (Phase 7) |
| `intelligence.ts` | Brand intelligence hooks + aggregation buckets (Phase 8) |
| `scale.ts` | Synthetic generator + scale certification (Phase 11) |
| `canonical-brands.ts` | 1327 real Indian brands, 70 companies, taxonomy classification |
| `index.ts` | Barrel + `buildCanonicalBrandEngine` / `buildCanonicalBrandSystem` |

## 2. Reuse of PP-1 (no duplication, no modification)

`lib/brands` imports `slugify`, `createDeterministicClock` and `TaxonomyEngine` from `@/lib/taxonomy`.
Brand classification validates department/category slugs against a real PP-1 `TaxonomyEngine`. PP-1
source is not modified.

## 3. Brand model (Phase 1)

`Brand` carries: id, name, slug, description, logoUrl, website, country, companyId, industry,
foundedYear, verificationStatus, status, departments[], categories[], aliases[], originRegion,
isLocalBrand, localizedNames (future localization), created/updated/deletedAt, mergedIntoId, metadata.

`Company` carries: id, name, slug, country, industry, foundedYear, parentCompanyId (M&A hierarchy),
aliases[] (e.g. "Hindustan Unilever" for HUL), status, metadata.

## 4. Ownership system (Phase 3)

Brand → company via `companyId`; company → company via `parentCompanyId`. The engine exposes
`getBrandsByCompany`, `getParentCompany`, `getCompanyAncestors`, `getSubsidiaries`,
`getOwnershipChain` and `getAllBrandsUnderCompany` (direct + via subsidiaries). The DB migration adds
a `brand_ownership` table for M&A/transfer history beyond the direct link.

## 5. Classification (Phase 4)

Every brand maps to ≥1 PP-1 taxonomy department (1327/1327 classified, 0 invalid mappings).
`BrandClassification` gives `getBrandsForDepartment`, `getDepartmentsForBrand`,
`getBrandsForCategory`, `unclassifiedBrands`, `invalidMappings`, and `coverage`.

## 6. Governance (Phase 5)

`BrandGovernance` supports create/edit/merge/archive/restore/verify/reject/deprecate. Merge folds
aliases into the target and marks the source `MERGED`. Every applied op is audited
(before/after snapshots). An approval workflow (`submit → approve/reject`) gates changes. All
timestamps use an injectable deterministic clock.

## 7. Readiness projections

- **Search (Phase 6):** `buildBrandSearchIndex` produces tokens from brand name + aliases + owning
  company name + company aliases (so "HUL" and "Hindustan Unilever" resolve to the same brands);
  `buildBrandSynonymGroups` + `brandsForSearchTerm` power misspelling/abbreviation lookups.
- **Recommendation (Phase 7):** `buildBrandAffinityGraph` emits same-company affinity edges,
  cross-company substitution edges and brand groups; `brandSimilarity` is a deterministic prior.
- **Intelligence (Phase 8):** `buildBrandIntelligenceProjection` exposes 8 hooks (demand, growth,
  share, risk, regional, emerging, hyperlocal, market penetration) + aggregation buckets/rollups.

## 8. Database (Phase 9)

`supabase/migrations/20260531010000_pp2_brand_universe.sql` (additive + idempotent): `brand_companies`,
`brand_universe`, `brand_ownership`, `brand_aliases`, `brand_taxonomy_links`, `brand_audit_log`,
`brand_change_requests`; RLS enabled (public read of active brands, ADMIN/SUPER_ADMIN full control);
reuses `public.set_updated_at` / `public.current_user_has_role`; `brand_integrity_check()` function.
The pre-existing `public.brands` table is left untouched.

## 9. Determinism

No `Date.now()` / `Math.random()` in core logic; slug-derived IDs + injectable deterministic clock.
Building the canonical universe twice yields byte-identical output (covered by a test).
