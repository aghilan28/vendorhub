# M4.2 — SECIS Domain Model

Phase: KARTEX M4 — System Evolution & Change Impact System
Source of truth: `lib/secis/types.ts`

The SECIS domain has 19 first-class entities. Each has a schema, relationships,
lifecycle, ownership, permissions, and governance treatment.

## Entity catalog

| # | Entity | Purpose | Key relationships |
| --- | --- | --- | --- |
| 1 | **Entity** (`SecisEntity`) | A node in the dependency graph (supplier, warehouse, courier, product, …). | Belongs to a System/Subsystem; connected by Edges. |
| 2 | **System** (`SecisSystem`) | A domain grouping of entities (Supply, Inventory, Fulfilment, Storefront, Pricing, Payments, Growth). | Owns Entities + Subsystems. |
| 3 | **Subsystem** | A finer grouping inside a System. | Belongs to a System. |
| 4 | **Dependency** | A directed graph edge where a downstream node depends on an upstream node (propagation channel). | `SecisEdge` with `category="dependency"`. |
| 5 | **Relationship** | A non-dependency typed link between entities. | `SecisEdge` with `category="relationship"`. |
| 6 | **Change Event** | An authored change (supplier failure, demand surge, …) originating at an entity. | Origin Entity; produces Propagation/Impact/Risk; has Workflow. |
| 7 | **Impact Event** | Per-entity impact produced by propagation (severity, depth, arrival period, ₹ at risk). | Belongs to a Propagation Result. |
| 8 | **Risk Event** | A scored, levelled risk for an affected entity. | Belongs to a Risk Assessment. |
| 9 | **Evolution Event** | A timeline milestone (shock / intervention / recovery). | Belongs to an Evolution Result. |
| 10 | **Propagation Path** | An ordered origin→…→node path with terminal severity. | Belongs to a Propagation Result. |
| 11 | **Impact Assessment** | Aggregated 8-dimension impact (operational, financial, inventory, demand, supply, delivery, customer, marketplace). | Computed from a Change Event + Propagation. |
| 12 | **Risk Assessment** | Overall risk level/score + factors + Risk Events. | Computed from a Change Event + Propagation + Impact. |
| 13 | **Recommendation** | A generated, acceptable action (mitigation / intervention / recovery / optimization / strategic / operational). | Belongs to a Change Event; may reference an Intervention. |
| 14 | **Intervention** | A catalog action applied in evolution (severity reduction, recovery boost, cost). | Referenced by Scenarios, Evolution Runs, Recommendations, Mitigations. |
| 15 | **Scenario** | A saved Change Event + chosen Interventions + Constraints. | References a Change Event + Interventions. |
| 16 | **Decision** | A recorded choice (adopt/reject/defer/escalate). | References a Change Event and/or Evolution Run. |
| 17 | **Constraint** | A bound on a dimension or risk used to validate outcomes. | Used by Scenarios. |
| 18 | **Mitigation** | A tracked, applied mitigation action. | References a Change Event + Intervention. |
| 19 | **Evolution Run** | An execution that simulates recovery with interventions. | Belongs to a Change Event/Scenario; produces an Evolution Result. |

Supporting: **Evolution Result** (series + KPIs + recovery/resilience),
`SecisUser`/`PlatformRole` (RBAC), `Permission`, `SecisSettings`, and
`SecisHistoryEvent` (audit).

## Propagation model (the heart)

Edges flow upstream → downstream. A change at the origin entity propagates with
per-hop **severity decay**:

```
childSeverity = parentSeverity × edgeWeight × (0.5 + targetVulnerability×0.5) × HOP_DECAY
```

Traversal is a relaxation BFS keeping the **maximum** severity per node, bounded
by `severityThreshold` and `maxDepth`, guaranteeing termination. It yields
affected entities (Impact Events), propagation paths, affected systems, a ₹
revenue-at-risk total, and an arrival timeline.

## Impact & risk

- Each entity **kind** maps to weighted impact **dimensions** (e.g. supplier →
  supply/inventory/operational; courier → delivery/operational/customer). Impact
  is the severity- and criticality-weighted sum per dimension, normalised 0–100;
  the financial dimension is expressed in ₹.
- Risk blends dominant-dimension score, blast-radius ratio, financial exposure,
  and critical-node involvement into a 0–100 score and a level
  (low/medium/high/critical), plus per-entity Risk Events.

## Evolution & recovery

System health starts at 100, drops at the shock proportional to peak severity,
and recovers each period at a rate driven by affected-node resilience.
Interventions reduce arriving severity and boost recovery. The result compares a
**no-action** path vs a **with-interventions** path, yielding recovery periods,
a resilience score, residual impact, avoided loss (₹), and intervention cost.

## Lifecycle (workflow)

```
draft → review → approved → running → completed → archived
```

Enforced by `WORKFLOW_TRANSITIONS`; every transition is audited.

## Ownership, permissions, governance

- Change events have an owner, visibility (`private`/`team`/`organization`), and
  version.
- Platform roles (`admin`, `analyst`, `operator`, `viewer`) map to permissions
  (`entity.manage`, `system.manage`, `event.create`, `event.run`,
  `decision.record`, `mitigation.apply`, `approval.record`, `settings.manage`).
- Every mutating action appends a `SecisHistoryEvent` (actor, timestamp,
  summary, references) for a complete audit trail.

## Persistence

The domain is persisted client-side via `store/secis-store.ts`
(zustand + `persist`, key `vendorhub-secis`), seeded with a realistic VendorHub
dependency graph so the product is alive on first load. Server APIs
(`/api/secis*`) expose the same engine for stateless analysis.
