# MCP-1D — Marketplace Recommendation System (Phase 8)

`lib/customer-growth/recommendations.ts` — a ranked, de-duplicated recommendation
set blended with the customer's personalization affinities.

## Recommendation kinds (10)

`recommended_product · recommended_store · trending_product · trending_store ·
nearby · similar · cross_sell · up_sell · recently_viewed · continue_shopping`.

## Scoring

- Product score = rating 30% + popularity 30% + category affinity 40%.
- Nearby uses distance ordering (reuses MCP-1C hyperlocal distance shapes).
- Similar seeds from the top recently-viewed category.
- Cross-sell / up-sell derive from cart categories.
- Continue-shopping comes from the abandoned cart.

## Output (`buildRecommendations`)

`RecommendationSet { items[], byKind, coverage }`:

- `items` are de-duplicated by id (highest score kept) and sorted by score.
- `coverage` = distinct kinds present / 10, so the surface can report how
  complete discovery is.

## Reuse

Operates on the same product/store candidate shapes the catalog and hyperlocal
phases already produce; complements `lib/marketplace-intelligence/recommendations.ts`
(seller/admin) with a **customer-facing** discovery layer.

## Exit criteria — met

Discovery improves automatically: every customer surface can show recommended,
trending, nearby, similar, cross/up-sell, recently-viewed and continue-shopping.
