# SEARCH AUDIT (Section 8)

**This is the strongest single system in the repository.**

| Capability | State | Evidence |
|------------|-------|----------|
| Marketplace search | ✅ | `searchLiveMarketplaceProducts` (`lib/ai/commerce-intelligence.ts`) |
| Vector/semantic | ✅ | RPC `search_products_hybrid` with `query_embedding` (pgvector), OpenAI embeddings (`createCommerceEmbedding`) |
| Keyword | ✅ | Postgres `search_document` websearch + `pg_trgm` fuzzy |
| Hybrid ranking | ✅ | semantic + fuzzy + keyword + operational + geo scores merged; `rankCommerceCandidates` adaptive |
| Personalization | ✅ | `buildPersonalizationProfile`, session signals, cold-start handling |
| Multilingual | ✅ | `expandQuery` transliteration (South-Indian commerce), `unaccent` |
| Geo feasibility | ✅ | distance/delivery feasibility folded into ranking |
| Fallback | ✅ | local hybrid ranking when vector RPC degrades; events recorded |
| Catalog search | ✅ | full-text `search_document` |
| Intelligence search | ✅ | `/api/intelligence/search` |
| Filters / sorting | 🟡 | category/vendor filters in query; **rich facet UI thin** |
| Autocomplete / typeahead | ❌ | no suggest endpoint/UI found |
| Suggestions / "did you mean" | 🟡 | `correctedQuery` field exists in result; UI surfacing unclear |

## Caveats
- **Env-gated:** without `OPENAI_API_KEY` + Supabase, vector search returns
  nothing and the local fallback ranks an **empty** candidate set.
- Search quality is unproven at scale (no load/relevance benchmarks in repo for
  this path).

## Conclusion
The retrieval engine is **genuinely above industry-baseline in architecture**
(pgvector + hybrid + personalization + multilingual). The UX layer (autocomplete,
facets, sort controls) and operational proof (relevance/latency at scale) lag the
engine.

**Search score: 6/10** (excellent engine; thin UX + unproven at scale + env-gated).
