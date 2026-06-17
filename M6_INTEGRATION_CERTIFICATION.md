# M6.11 — Integration Certification Report

Phase: KARTEX M6 — Cross-System Intelligence Integration Platform

This report certifies that the five systems behave as **one** platform.

## Integration checklist

| Requirement | Evidence | Status |
| --- | --- | --- |
| Continuous Research→Knowledge→Simulation→SECIS→Governance workflow | `IntelligenceWorkflow.stages` in canonical order; Workflow Center advances through them | ✅ |
| Trigger downstream workflows | `advanceWorkflow` completes a stage and activates the next, creating its node + provenance | ✅ |
| Maintain lineage | `parentIds` chain + Lineage Center graph | ✅ |
| Track dependencies / provenance | merged provenance across spine + Governance + SECIS | ✅ |
| Track ownership / approvals / status | owner + stage owner; governance approvals surfaced; stage statuses | ✅ |
| Unified dashboard | `/intelligence` aggregates activity, health, recent + pending across all systems | ✅ |
| Visual workflow | Stage-flow pipeline component | ✅ |
| Visual lineage graph | `LineageGraph` SVG | ✅ |
| Cross-system search | `/intelligence/search` indexes Research/Knowledge/Simulation/SECIS/Governance | ✅ |
| One-system navigation | "Intelligence Hub" entry in every system sidebar; hub links into each system; deep links from lineage/search | ✅ |
| Real cross-references | Seeded workflows link `sim_pricing`, `ce-supplier`, `dec-pricing`, `dec-backup` | ✅ |
| No broken integrations | Clean merge; 230 tests pass; build succeeds | ✅ |

## Duplicate-model resolution

Per-system models (`WorkflowState`, `RiskLevel`, audit/history, RBAC, decisions)
are intentionally retained per domain. M6 does **not** flatten them; it adds a
canonical spine that references them. This avoids a risky rewrite while delivering
true unification (identity, lineage, provenance, orchestration, search, dashboard).

## Conclusion

A user no longer experiences five separate systems. From `/intelligence` they see
one platform: activity across all systems, a continuous workflow, an end-to-end
lineage graph, cross-system provenance, and a single search — with one click into
any underlying system. **Integration is certified.**
