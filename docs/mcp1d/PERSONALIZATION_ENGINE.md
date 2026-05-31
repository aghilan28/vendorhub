# MCP-1D — Personalization Engine (Phase 7)

`lib/customer-growth/personalization.ts` — behaviour tracking → category / brand
/ store / location affinities → a personalization profile that drives
personalized home / search / recommendations / offers.

## Affinity model

Behaviour signals (`views`, `wishlists`, `purchases`) are weighted (1 / 3 / 6),
aggregated per key and **normalized 0–100** (top key = 100). Reproducible: the
same signals always produce the same scores.

## Output (`buildPersonalizationProfile`)

`PersonalizationProfile { categoryAffinity, brandAffinity, storeAffinity,
locationAffinity, topInterests, personalizationScore }`.

- `topInterests` merges declared interests with the top category/brand affinities.
- `personalizationScore` (0–100) reflects data richness: populated dimensions
  (60%) + signal volume (40%).

## Ranking (`personalizeRanking`)

Blends a candidate's base score (40%) with the customer's affinity (60%), so
personalized surfaces re-order toward what the customer actually engages with —
demonstrated in tests where a high-affinity category outranks a higher base score.

## Exit criteria — met

The marketplace becomes customer-specific: interests + affinities re-rank home,
search, recommendations and offers.
