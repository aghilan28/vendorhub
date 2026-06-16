# M6.1 — Integration Baseline Audit Report

Phase: KARTEX M6 — Cross-System Intelligence Integration Platform
Date: 2026-05-30

## 1. Method

This integration branch combines the prior phase branches so all systems are
present together for the first time:

```
feat/m6-integration = main + feat/m3-simulation-os + feat/m4-secis + feat/m5-governance
```

Each prior system was audited for existing, partial, missing, and broken
integrations, and for duplicate models/entities/workflows.

## 2. System inventory (post-merge)

| System | Status on this branch | Surface |
| --- | --- | --- |
| M1 Research OS | **Not a product** | No `/research` routes exist; "Research" only appeared as a conceptual source-system label. |
| M2 Knowledge OS | **Not a product** | No `/knowledge` routes; only `app/api/tier10/knowledge` (abstract). |
| M3 Simulation OS | **Exists** | `/simulations/*` (13 routes), `store/simulation-store`, `lib/simulation`. |
| M4 SECIS | **Exists** | `/secis/*` (16 routes), `store/secis-store`, `lib/secis`. |
| M5 Governance OS | **Exists** | `/governance/*` (16 routes), `store/governance-store`, `lib/governance-os`. |

## 3. Integration findings

| Aspect | Finding | Status |
| --- | --- | --- |
| Cross-system references | Governance decisions already carry `sourceSystem` + `sourceRef` (e.g. `simulation:sim_pricing`, `secis:ce-supplier`) pointing at real seeded items. | **Partial integration (data only)** |
| Navigable links between systems | None — each system is a standalone sidebar; a decision referencing a simulation cannot be opened from the decision. | **Missing** |
| Unified lifecycle (Research to Governance) | Does not exist; Research and Knowledge are not even products. | **Missing** |
| Lineage / provenance across systems | None. Each system has its own local audit/history; nothing connects them. | **Missing** |
| Cross-system search | Each system has its own lists; there is a vendor-search API (`/api/intelligence/search`) but no governance/simulation/secis search. | **Missing** |
| Unified dashboard | None; five separate command centers. | **Missing** |
| Orchestration engine | None; no way to trigger downstream work or track a workflow across systems. | **Missing** |
| Duplicate models | Each system independently defines `WorkflowState`, `RiskLevel`, audit/history, RBAC, and a "decision" concept. These are **parallel, not conflicting** — appropriate per-domain, but there is no canonical spine tying them together. | **Duplication without unification** |
| Broken integrations | None broken; merge of M3/M4/M5 is clean and all 224 prior tests pass. | **OK** |

## 4. Gap summary

Today KARTEX is **five tools that share a codebase**, not one platform:

1. No canonical intelligence model spanning the five stages.
2. No orchestration of the continuous Research to Governance workflow.
3. No lineage graph or cross-system provenance.
4. No cross-system search or unified dashboard.
5. The real cross-references that *do* exist (governance to simulation/secis)
   are invisible and non-navigable to users.

## 5. M6 realization strategy

M6 adds the **connective spine** without rebuilding the systems:

1. **Canonical Intelligence Model** (`lib/intelligence-platform/types.ts`) — a
   stage-aware `IntelligenceNode`, `IntelligenceWorkflow`, and `ProvenanceEvent`
   with canonical IDs, cross-system references (`system` + `refId` + `refRoute`),
   shared lineage (`parentIds`), and shared provenance (M6.2).
2. **Orchestration Engine** (`engine.ts`) — canonical stage order, lineage layout,
   workflow progress, and downstream-trigger helpers (M6.3).
3. **Persisted spine store** (`store/intelligence-platform-store.ts`) — workflows
   + Research/Knowledge canonical nodes + provenance, **seeded to connect the
   already-seeded real items** (Simulation `sim_pricing`, SECIS `ce-supplier`,
   Governance `dec-pricing`/`dec-backup`).
4. **Unified UI** (`(intelligence)` route group) — dashboard, workflow center,
   lineage center, provenance system, and cross-system search, plus hub links into
   all five systems so the user experiences **one** platform (M6.4 to M6.8).
5. Cross-store aggregation hooks read the Simulation/SECIS/Governance stores so
   activity, search, recent/pending actions, and provenance are genuinely unified.

This baseline confirms M6 is the integration phase: the systems exist but are
disconnected, and M6 must make them feel like one.
