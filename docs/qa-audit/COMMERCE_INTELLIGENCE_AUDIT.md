# Commerce Intelligence Audit

**Method:** Source code review of intelligence engines and their integration with live commerce data.
**Classification:** Real | Partial | Demo | Disconnected | Integrated
**Date:** 2026-05-31

---

## Engine Classification

| Engine | Classification | Evidence |
|--------|---------------|----------|
| Research OS (Tier-based) | DEMO / DISCONNECTED | `lib/tier10/` (356 lines), `/api/tier10/*` routes exist but operate on seed/abstract data, not live commerce |
| Knowledge OS | DEMO / DISCONNECTED | Tier knowledge migrations (`tier_8_knowledge_system_ingestion`) — research artifacts, not commerce-integrated |
| Simulation | DEMO | `lib/tier10` simulation, `/api/tier10/simulation` — stateless compute, not wired to live orders |
| SECIS | DEMO | `tier_11_secis_implementation` migration, `lib/tier11/` (296 lines) — abstract change-impact, disconnected from commerce |
| Governance | PARTIAL / INTEGRATED | `/api/governance/detection`, `features/governance/trust-engine`, `governance_cases` table — real governance data |
| Execution | DISCONNECTED | Execution OS exists on unmerged branches (M8); no live commerce link on main |
| Seller Intelligence | REAL / INTEGRATED | `features/merchant-intelligence/engine.ts` (453 lines) consumes live products/inventory/orders via `getSellerOperationalSnapshot()` |
| Catalog Intelligence | PARTIAL | `lib/catalog-governance/engine.ts` (290 lines) real quality scoring; fuller on branch |
| Growth Intelligence | DISCONNECTED (main) | MCP-1D `lib/customer-growth/` on unmerged branch only |
| Operational Intelligence | DISCONNECTED (main) | MCP-1E `lib/marketplace-operations/intelligence.ts` on unmerged branch only |
| Trust Intelligence | PARTIAL / INTEGRATED | `features/trust/scoring`, `trust_scores` table, `features/governance/trust-engine` real |
| Commerce/AI Search Intelligence | REAL / INTEGRATED | `lib/ai/commerce-intelligence.ts` (360 lines), OpenAI embeddings + hybrid ranking + personalization, degrade-safe |

---

## Integration Reality

| Tier | Verdict |
|------|---------|
| **What IS integrated with live data** | Seller intelligence (real product/order reads), AI search/ranking (real catalog + embeddings), trust scoring, governance detection |
| **What is DISCONNECTED** | Tier 10-15 research engines (simulation, SECIS, knowledge OS) — they run on seed/abstract data and do NOT touch live commerce. This matches the original Phase-J/audit finding. |
| **What is BRANCH-ONLY** | Marketplace-wide intelligence (MCP-0E), growth intelligence (MCP-1D), operational intelligence (MCP-1E) |

---

## Critical Findings

1. **Two classes of intelligence exist:** (a) commerce-integrated intelligence that reads real data (seller intelligence, AI search) — genuinely valuable; (b) research-tier engines (Tier 10-15) that are sophisticated but disconnected from live commerce.
2. **The flagship "intelligence → execution" loop does NOT touch live commerce data on main** — the tier/execution engines remain demonstration layers.
3. **Real, usable intelligence on main:** AI-powered search with OpenAI embeddings (`lib/ai/`, 360+ lines) and merchant intelligence (453 lines) are the genuine, integrated commerce intelligence.

---

## Verdict

**Score: 5/10.** There is genuine, integrated commerce intelligence (seller analytics, AI search, trust scoring). But a large volume of "intelligence" code (Tier 10-15, ~1,000+ lines) is disconnected research/demonstration scaffolding that does not influence live commerce. The marketplace-wide, growth, and operational intelligence engines are real but live only on unmerged branches.
