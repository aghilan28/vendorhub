# EC1 Duplication Audit

**Branch:** `release/v1-candidate`
**Date:** 2026-05-31

---

## Methodology

Because the MCP stack is a single linear trunk (not parallel branches), structural duplication is minimal — each phase built on the prior rather than re-forking. The only divergent stream (1E/1F/1G) was additive. Findings below are from the consolidated tree.

---

## Duplicate Routes

| # | Source A | Source B | Survives | Why |
|---|----------|----------|----------|-----|
| 1 | `/product/[slug]` | `/products/[id]` | **Both retained** | Pre-existing in base; slug-based is canonical SEO route, id-based is internal/legacy link target. Not a merge artifact. Flagged for EC-2 cleanup, not a blocker. |
| 2 | `/seller/support` (MCP-0G help center) | `/seller/support` (MCP-1E ticket system) | **MCP-1E** | Resolved at merge (see EC1_MERGE_LOG). Ticket system is the operating capability. |

## Duplicate Pages — None

No two page files render the same purpose at different URLs (other than the route pair above, which are pre-existing).

## Duplicate APIs — None

All 41 API routes have distinct purposes. `/api/operations/health` (infra) vs `/api/operations/marketplace` (marketplace ops snapshot) are distinct, not duplicates.

## Duplicate Engines

| Concern | Modules | Verdict |
|---------|---------|---------|
| "Intelligence" | `lib/marketplace-intelligence/` (0E), `features/merchant-intelligence/` (pre-existing), `lib/marketplace-operations/intelligence.ts` (1E), `lib/executive-intelligence/` | **Not duplicates** — different scopes: marketplace-wide demand/pricing (0E), seller merchant health (pre-existing), operational risk (1E), executive strategy. Complementary layers. |
| "Catalog" | `lib/catalog/` (0B), `lib/catalog-population/` (1B), `lib/catalog-governance/`, `lib/commerce-foundation/` | **Not duplicates** — 0B = taxonomy/ingestion engine, 1B = scale/population over 0B, governance = quality gating, foundation = base types. Layered, reuse-first. |
| "Hyperlocal" | `lib/geo/`, `lib/hyperlocal-operations/`, `lib/hyperlocal-discovery/`, `lib/hyperlocal/` (1C) | **Partial overlap** — 1C `lib/hyperlocal/` extends the older geo/hyperlocal-* modules. The older modules remain consumed; 1C adds geohash/serviceability on top. Flagged for EC-2 unification (non-blocking). |

## Duplicate Stores

| Store | Verdict |
|-------|---------|
| 15 global + 3 feature (admin, seller, execution) | **No duplicates** — each domain-scoped. `intelligence-store`, `operations-store`, `trust-store` are distinct domains. |

## Duplicate Hooks / Schemas / Navigation

- **Hooks:** No duplicate query hooks found; `features/*/queries` are domain-scoped.
- **Schemas:** `lib/validations/*` are per-entity; no duplication.
- **Navigation:** Single source `lib/constants/navigation.ts` (buyer/seller/admin). No duplicate entries after MCP-0G placeholder removal.

---

## Duplication Verdict

**Minimal duplication.** The linear-trunk MCP architecture (each phase extends the prior) prevented fork-style duplication. Two non-blocking items flagged for EC-2:
1. `/product/[slug]` + `/products/[id]` route pair (pre-existing, not a merge artifact)
2. `lib/hyperlocal/` (1C) overlaps older `hyperlocal-*` modules (layered, candidate for unification)

Neither blocks the release candidate.
