# EC-5 Phase 3 — Buyer Intelligence Certification

**Source:** `lib/marketplace-intelligence/buyer.ts`, `lib/ai/commerce-intelligence.ts`, `features/intelligence/{hybrid-ranking,search-ranking,recommendations,behavioral-events}.ts`, `/discover`, `/search`, `intelligent-product-grid`.

| Capability | Status | Evidence |
|-----------|--------|----------|
| Recommendations | ✅ REAL | `buildBuyerIntelligence` recommended list; `getLiveRelatedProductIds`, `listVectorRelatedProducts`; recommendation strip |
| Discovery assistance | ✅ REAL | `/discover` smart discovery; `assembleRecommendations` buyer scope |
| Availability predictions | ✅ REAL | `buildBuyerIntelligence` availability predictions |
| Delivery predictions | ✅ REAL | buyer intelligence delivery prediction + hyperlocal ETA |
| Personalization | ✅ REAL | `lib/ai/personalization.ts`; `features/intelligence/behavioral-events.ts` |
| Search intelligence | ✅ REAL | `/api/intelligence/search` — OpenAI embeddings + hybrid ranking + fallback |
| Product ranking | ✅ REAL | `features/intelligence/hybrid-ranking.ts`, `search-ranking.ts`; geo + semantic blend |
| Behavioral adaptation | ✅ REAL | `behavioral-events.ts` feeds recent queries/views/cart into ranking |

## Executed evidence
`mcp0e-marketplace-intelligence.test.ts` "buyer intelligence" — produces trending, recommendations, availability and delivery predictions. The search route blends behavioral context (recentQueries/exploredCategories/recentlyViewed/cart) into ranking.

## Honest scope
Personalized ranking requires OpenAI embeddings for the semantic component; without the key, hybrid search degrades to deterministic text+geo ranking (still adaptive to behavior).

**Status: PASS.**
