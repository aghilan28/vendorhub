# EC1 Branch Inventory

**Date:** 2026-05-31
**Method:** Direct git history analysis after fetching the MCP stack into the workspace.

---

## Critical Discovery

The MCP work is **NOT 23 independent branches**. It is a **single linear stack** on `feat/mcp1d-customer-growth` (`a5a3b80`), plus my three locally-built phases. Every PR from #15→#34 is a sequential commit on one lineage rooted at `4df0098` (origin/main HEAD, the "depth" commit).

---

## The Real Lineage (verified via `git log`)

```
4df0098  depth                              ← origin/main HEAD (root)
 └ fde85d9  M8  Execution & Decision Activation         (PR #20)
   └ 61fc8dd  Phase N  Platform Realization & Showcase  (PR #21)
     └ 13000f2  Phase O  Completion & v1.0 Readiness    (PR #22)
       └ d5ed941  Reality Audit                         (PR #23)
         └ 4f1a588  MCP-0A  Media Pipeline              (PR #24)
           └ 7281991  MCP-0B  Catalog Activation        (PR #25)
             └ 353c1d7  MCP-0C  Seller OS               (PR #26)
               └ d23c65c  MCP-0D  Trust Layer           (PR #27)
                 └ ca79807  MCP-0E  Intelligence        (PR #28)
                   └ 8f95dd5  MCP-0F  Commerce Txn       (PR #29)
                     └ 98be956  MCP-0G  Realization      (PR #30)
                       └ 2cf1f68  MCP-1A  Seller Activation   (PR #31)
                         └ 0fc6aaa  MCP-1B  Product Population (PR #32)
                           └ 41d2a1f  MCP-1C  Hyperlocal       (PR #33)
                             └ a5a3b80  MCP-1D  Customer Growth (PR #34)
```

Plus, built locally this session on the same `4df0098` root (divergent until EC-1):

```
4df0098
 └ 30fa5b6  MCP-1E  Marketplace Operations    (PR #35)
   └ 6fbe380  MCP-1F  Launch Certification     (PR #36)
     └ 2b4ccbd  MCP-1G  Pilot Launch           (PR #37)
       └ a285d6b + 421311e  QA Reality Audit (docs)
```

---

## Per-Phase Detail

| PR | Commit | Phase | Key Modules Added | Routes Added | Migrations |
|----|--------|-------|-------------------|--------------|------------|
| #20 | fde85d9 | M8 Execution | `lib/execution/`, `features/execution/` | `/admin/execution`, `/api/execution` | — |
| #21 | 61fc8dd | Phase N | `lib/platform/` | `/platform`, `/showcase` | — |
| #22 | 13000f2 | Phase O | `lib/platform/search,guides` | `/platform/docs` | — |
| #23 | d5ed941 | Audit | docs only | — | — |
| #24 | 4f1a588 | MCP-0A | `lib/media/` (8 mod) | `/seller/media`, `/admin/media` | mcp0a_media_platform |
| #25 | 7281991 | MCP-0B | `lib/catalog/` (9 mod), `config/catalog/taxonomy.json` | `/admin/catalog`, `/seller/catalog` | mcp0b_catalog_seed |
| #26 | 353c1d7 | MCP-0C | `lib/seller-os/` (10 mod) | `/seller/operations` | mcp0c_seller_promotions |
| #27 | d23c65c | MCP-0D | `lib/trust/` (10 mod) | `/admin/trust`, `/seller/reputation` | product_questions, return_requests, support_tickets |
| #28 | ca79807 | MCP-0E | `lib/marketplace-intelligence/` (15 mod) | `/admin/intelligence`, `/seller/intelligence`, `/discover` | — |
| #29 | 8f95dd5 | MCP-0F | `lib/commerce-transaction/` (13 mod) | `/seller/fulfillment`, `/admin/commerce`, `/api/commerce` | — |
| #30 | 98be956 | MCP-0G | navigation fixes, loading states | removed 3 `*-placeholder` routes; added real `/seller/support`, `/seller/payouts`, `/admin/platform-health` | — |
| #31 | 2cf1f68 | MCP-1A | `lib/seller-activation/` (11 mod) | `/seller/onboarding`, `/seller/activation`, `/seller/import`, `/admin/sellers`, `/admin/population`, `/store/[slug]` | — |
| #32 | 0fc6aaa | MCP-1B | `lib/catalog-population/` (13 mod) | `/seller/catalog-ops`, `/admin/catalog-governance` | — |
| #33 | 41d2a1f | MCP-1C | `lib/hyperlocal/` (11 mod) | `/nearby`, `/seller/hyperlocal`, `/admin/location` | — |
| #34 | a5a3b80 | MCP-1D | `lib/customer-growth/` (12 mod) | `/rewards`, `/admin/growth`, `/api/growth` | — |
| #35 | 30fa5b6 | MCP-1E | `lib/marketplace-operations/` (12 mod) | `/admin/operations`, `/support`, `/seller/support`, `/disputes`, `/api/operations/marketplace` | — |
| #36 | 6fbe380 | MCP-1F | `lib/launch-certification/` (5 mod) | — | — |
| #37 | 2b4ccbd | MCP-1G | `lib/pilot-launch/` (3 mod) | — | — |

---

## Dependency Graph

- **Single trunk:** Every phase 0A→1D is stacked sequentially. There are **no independent parallel branches** — each builds on the prior. Merge order is therefore forced and unambiguous.
- **My phases (1E/1F/1G)** were built on `4df0098` (not on 1D), so they were *divergent* but *additive* (new files only, except one route collision).
- **Merge order for EC-1:** Take `a5a3b80` (contains M8→1D linearly) as the base, then layer 1E → 1F → 1G → audit docs on top.

---

## Classification

| Type | Branches |
|------|----------|
| Stacked (linear trunk) | M8, N, O, audit, 0A–0G, 1A–1D (one lineage = `a5a3b80`) |
| Divergent-but-additive | 1E, 1F, 1G + audit docs (rooted at same `4df0098`) |
| Independent | None |
| Conflicting | Only 1 file: `app/(seller)/seller/support/page.tsx` (0G vs 1E) |

**Conclusion:** Consolidation is a linear fast-forward of the 0A–1D trunk plus a 5-commit cherry-pick of 1E–1G. Minimal conflict surface (1 file).
