# MCP-1A.10 — Intelligence Activation Layer

**Engine:** `lib/seller-activation/intelligence.ts`. Commerce intelligence now
operates on **real marketplace entities** — sellers, stores, catalogs, inventory
and population activity.

## Intelligence domains (all mandated)
- **Seller growth** — live, healthy stores get expansion/variant growth actions.
- **Catalog** — populate / publish / improve-quality recommendations per seller.
- **Activation** — finish-onboarding / submit / low-activation-rate actions.
- **Population** — verification & catalog drop-off, product-target progress.
- **Marketplace expansion** — under-covered categories to recruit into.
- **Trust** — verification failures and flagged sellers needing risk review.

## Two entry points
- `sellerRecommendations(activationSnapshot)` — per-seller, ranked actions
  (surfaced in the Activation Center and seller intelligence).
- `marketplaceRecommendations(population, governance)` — marketplace-level
  population/expansion/trust actions (surfaced in `/admin/sellers` and
  `/admin/population`).

Both return `ActivationRecommendation` (kind, scope, severity, title, detail,
action, 0–100 score), ranked by impact.

## Operates on real data
Recommendations are computed from the live population/governance snapshots
(`queries.ts`) when Supabase is configured, and from the labelled sample
otherwise — never demo data inside a "live" result.

## Exit criteria — met
Intelligence produces action + operational recommendations grounded in real
sellers/stores/catalogs/population. Covered by 2 intelligence tests.
