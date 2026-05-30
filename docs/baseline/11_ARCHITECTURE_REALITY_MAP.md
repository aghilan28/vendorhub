# Deliverable 11 — Product Architecture Reality Map

Maps **intended architecture** (tiers/phases as documented) to **what physically exists and where**. The central reality: the system is a set of parallel branches, not an integrated whole.

## 11.1 Branch reality (the defining fact)

```
                         origin/main @ 4df0098  (commerce core baseline)
                                  │  (common ancestor of ALL phase branches)
   ┌──────────┬──────────┬───────┼────────┬───────────┬───────────┬─────────────┐
  A:audit   B:infra    C:obs   D:reliab  E:ai-plat  F:commerce  G:advanced ...   (unmerged)
 prod-fnd  dist-rt   observ   failsurv  foundation  intel-ops  systems-ops
                                  │
                       H:ent-readiness  I:prod-cert  stage-1  J:tier-audit
                                  │
                       K:commerce-intelligence-productization  (14 intelligence pages)
                                  │
                       L:phase-l-finalization  ← CERTIFIED (= main + vitest fix), PR #13
```

> **None merged.** `main` contains neither B's runtime, E/F/G's AI/intelligence operationalization, nor K's intelligence UI. The "platform" is an *aggregate intent* distributed across 13 branches.

## 11.2 Layer reality (in the certified tree)

| Layer | Intended | Reality on certified `main` line |
|---|---|---|
| **UI / Pages** | Buyer + Seller + Admin + Intelligence studios + Research/Knowledge/Governance centers | Buyer/Seller/Admin **present**; intelligence studios **absent (K)**; research/knowledge/governance centers **never built** |
| **API** | Full commerce + intelligence + advanced-tier + runtime | Commerce/logistics/payments/intelligence-search/seller/admin **present**; advanced-tier **introspection-only**; runtime APIs (`/api/runtime/*`, `/api/advanced/*`, `/api/ai/*`) **on Phase G, absent here** |
| **Domain modules (`lib/`)** | Tiers 1–15 | `tier10,11,13,14,15` present; **`tier12` absent**; many domain libs present (geo, logistics, payments, governance, executive-intelligence, etc.) |
| **Events** | Kafka/Flink streaming (Phase B/G) | Schemas/topics exist **on Phase B/G branches only**; not in certified tree |
| **Data (`supabase/migrations`)** | Tier/phase schemas | **45 migrations present** — DB is the most-integrated layer |
| **Infra** | Redis/Kafka/Neo4j/Qdrant/Flink, k8s, observability | Exists **on Phase B/G branches**; not in certified tree |
| **Docs** | Tier RFCs, KMOS, phase blueprints | **Extensively present** — docs are ahead of realized product |

## 11.3 Gap classes

1. **Integration gap** — branches not merged (the dominant gap).
2. **Surfacing gap** — backend/API exists without UI (T5/T6/T10/T11/T14/T15).
3. **Build gap** — capabilities that are research/architecture-only (T8/T12/T13).
4. **Environment gap** — operator surfaces uncertifiable without seeded auth + Supabase.

## 11.4 Reality statement

> The repository is **documentation-led and DB-backed**, with a **fully realized commerce UI core** and a large **unrealized intelligence/research substrate** that is both *unmerged* (Phase B–G, K) and *unsurfaced* (T5–T15). Architectural intent substantially exceeds integrated reality. The single highest-leverage action is an **integration program**, not new building.
