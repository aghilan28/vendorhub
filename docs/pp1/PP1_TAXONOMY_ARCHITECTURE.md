# PP1_TAXONOMY_ARCHITECTURE

**Program:** VendorHub Product Population — Wave 1 (PP-1)
**Deliverable:** Canonical Commerce Taxonomy Foundation (`lib/taxonomy/`)
**Status:** Built, validated, and certified. No products / inventory / sellers / stores created.

---

## 1. Hierarchy (Phase 1)

Six canonical levels, modelled as a single self-referential node type so the hierarchy can expand
without future restructuring:

```
DEPARTMENT (0) > CATEGORY (1) > SUBCATEGORY (2) > PRODUCT_FAMILY (3) > PRODUCT_TYPE (4) > VARIANT_GROUP (5)
```

These map onto the pre-existing `public.taxonomy_level` enum via `LEVEL_TO_COMMERCE_FOUNDATION`
(`PRODUCT_TYPE → PRODUCT_GROUP`, `VARIANT_GROUP → VARIANT`) so the foundation interoperates with the
existing commerce-foundation schema rather than duplicating it.

Every node carries: stable id, hierarchical slug (globally unique), human path, localized names,
synonyms, search terms, attribute keys, SEO block, region list, status, version, soft-delete and
metadata — see `lib/taxonomy/types.ts`.

## 2. Module map (`lib/taxonomy/`)

| Module | Responsibility |
|---|---|
| `types.ts` | Levels, node/attribute/governance/validation types, deterministic `Clock` |
| `slug.ts` | Deterministic slugify, hierarchical slug/path builders, deterministic clock |
| `attributes.ts` | Reusable attribute registry (no duplication) + level-aware lookups (Phase 4) |
| `engine.ts` | `TaxonomyEngine` (indexed traversal/lookup), `resolveInputs`, `rederiveStructure` |
| `validation.ts` | `validateTaxonomy` integrity engine (Phase 9) |
| `governance.ts` | `TaxonomyGovernance` — create/edit/deprecate/merge/split/archive/restore + approval + audit (Phase 10) |
| `search.ts` | Search-readiness projection (Phase 5) |
| `recommendation.ts` | Affinity / substitution / similarity readiness (Phase 6) |
| `intelligence.ts` | Aggregation buckets + analysis hooks (Phase 7) |
| `scale.ts` | Synthetic generator + scale certification (Phase 11) |
| `canonical-taxonomy.ts` | Production-grade sample taxonomy (26 departments, 536 categories) |
| `index.ts` | Barrel + `buildCanonicalTaxonomyEngine` / `buildCanonicalGovernance` |

## 3. Engine (Phases 1, 5–7)

`TaxonomyEngine` builds O(1) indexes (`byId`, `bySlug`, `byPath`, `childrenByParent`) and offers
`getParent`, `getChildren`, `getAncestors`, `getDescendants`, `getSiblings`, `getRoots`, `getLeaves`,
`getByLevel`, and `resolveAttributes` (own + inherited, nearest-wins). Resolution is order-independent
and deterministic; structural restructures re-derive paths via `rederiveStructure` while preserving
stable ids, versions and timestamps.

## 4. Attribute framework (Phase 4)

`AttributeRegistry` holds each attribute definition exactly once (keyed, de-duplicated) with
`appliesToLevels`, `isFilterable`, `isSearchable`, `isVariantDefining`. Canonical attributes:
weight, volume, pack_size, material, flavor, color, gender, age_group, organic, vegetarian,
prescription_required, country_of_origin, storage_type, shelf_life, brand_required. Nodes reference
attributes by key; the engine resolves inheritance down the tree.

## 5. Validation engine (Phase 9)

`validateTaxonomy` deterministically detects: circular references, orphan nodes, duplicate
slugs/paths/ids, broken hierarchy (level skipping), invalid parent assignment, missing root parent,
depth violations, unknown attributes, and attribute/level mismatches. Returns a structured report
(`valid`, `errorCount`, `warningCount`, `issues[]`). A SQL-side `public.taxonomy_integrity_check()`
mirrors the core structural checks for the database.

## 6. Governance (Phase 10)

`TaxonomyGovernance` maintains a mutable store and supports create / edit / deprecate / merge / split
/ archive / restore. Merge re-parents children and marks sources `MERGED` with lineage; split creates
sibling nodes and reassigns children, marking the source `SPLIT`. Every applied operation appends a
`TaxonomyAuditEntry` (before/after snapshots). An approval workflow (`submitChangeRequest` →
`approveChangeRequest` / `rejectChangeRequest`) gates changes through `PENDING_APPROVAL → APPLIED/REJECTED`.
All timestamps come from an injectable deterministic clock.

## 7. Database implementation (Phase 8)

`supabase/migrations/20260531000000_pp1_canonical_taxonomy_foundation.sql` (additive + idempotent):

- `taxonomy_nodes` — self-referential hierarchy with slug/path/SEO/audit fields, versioning,
  soft delete (`deleted_at`), `merged_into_key` lineage, localized names + region arrays, metadata.
- `taxonomy_attribute_definitions` + `taxonomy_node_attributes` — reusable attribute framework.
- `taxonomy_synonyms` — search-readiness grouping.
- `taxonomy_audit_log` + `taxonomy_change_requests` — governance audit + approval workflow.
- RLS enabled on all tables (public read of active data; ADMIN/SUPER_ADMIN full control via the
  existing `public.current_user_has_role`), `updated_at` triggers via existing `public.set_updated_at`,
  and indexes on parent/level/status/path/synonyms.

## 8. Determinism

No `Date.now()` / `Math.random()` in core logic. Slugs/ids derive from the hierarchical path;
timestamps come from `createDeterministicClock`. Building the canonical taxonomy twice yields
byte-identical output (covered by a test).
