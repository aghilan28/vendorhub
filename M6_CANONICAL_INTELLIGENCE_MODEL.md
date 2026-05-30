# M6.2 — Canonical Intelligence Model

Phase: KARTEX M6 — Cross-System Intelligence Integration Platform
Source of truth: `lib/intelligence-platform/types.ts`

The canonical model is the connective spine that turns five systems into one
platform. It does **not** replace the per-system models; it references them.

## Unified lifecycle

```
Research → Knowledge → Simulation → Impact (SECIS) → Governance
```

`STAGE_ORDER = ["research", "knowledge", "simulation", "secis", "governance"]`

Each stage maps to where its work happens (`STAGE_META`): Research and Knowledge
are owned by the platform spine; Simulation, SECIS, and Governance link to the
existing operating systems.

## Canonical entities

| Entity | Role |
| --- | --- |
| **IntelligenceNode** | A canonical node in the lineage with a `stage`, owner, status, **canonical id**, optional **cross-system reference** (`refId` + `refRoute`), and **lineage** (`parentIds`). |
| **IntelligenceWorkflow** | A continuous initiative whose `stages[]` (one per lifecycle stage) carry their own status and a reference to the underlying item. |
| **WorkflowStageState** | The state of one stage: `pending | in_progress | blocked | complete`, plus `nodeId`, `system`, `refId`, `refRoute`. |
| **ProvenanceEvent** | A who/what/when record (`created`, `published`, `executed`, `analyzed`, `approved`, `governed`, `linked`, `advanced`) tied to a node + stage + system. |

## Canonical IDs & cross-system references

- Every canonical node has a platform id (`in_…`). Stages that represent work in
  another system additionally carry `refId` (the item's id in its system) and
  `refRoute` (a deep link), e.g.:
  - Simulation stage → `refId: "sim_pricing"`, `refRoute: "/simulations/sim_pricing"`
  - SECIS stage → `refId: "ce-supplier"`, `refRoute: "/secis/ce-supplier"`
  - Governance stage → `refId: "dec-pricing"`, `refRoute: "/governance/decisions/dec-pricing"`
- These are **real** references to items already seeded by M3/M4/M5, so lineage is
  navigable end to end.

## Shared lineage

`IntelligenceNode.parentIds` forms a directed acyclic chain across stages. The
Lineage Center renders this as a stage-columned graph; clicking a node opens the
underlying item in its system.

## Shared ownership

Each workflow and node has an `ownerId`/`ownerName`. Stage `owner` records who is
accountable for that stage. The acting user (with a platform role) is resolved
from the spine store.

## Shared audit / provenance

Provenance is **merged across systems**: the Provenance System combines the
platform's own `ProvenanceEvent`s with the underlying systems' audit/history
(Governance `AuditRecord`s for the governance stage's `refId`; SECIS history for
the SECIS stage's `refId`). The result is one who-did-what timeline spanning all
five systems.

## Shared permissions

Three platform roles (`orchestrator`, `contributor`, `viewer`) govern the spine
(`workflow.manage`, `workflow.advance`, `node.create`). Per-system actions remain
governed by each system's own RBAC, so authority is layered, not duplicated.

## Why this is unification, not a sixth tool

The model intentionally **references** rather than **re-implements**. Simulation
runs still live in the Simulation OS; decisions still live in Governance. The
canonical model adds the missing spine — identity, lineage, provenance, and a
continuous workflow — so the five systems are experienced as one.
