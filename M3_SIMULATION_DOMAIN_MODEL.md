# M3.2 — Simulation Domain Model

Phase: KARTEX M3 — Simulation Operating System
Source of truth: `lib/simulation/types.ts`

This document defines the 18 first-class entities of the Simulation Operating
System. Each entity has a schema, relationships, lifecycle, ownership,
permissions, and governance treatment.

## Entity catalog

| # | Entity | Purpose | Key relationships |
| --- | --- | --- | --- |
| 1 | **SimulationVariable** | An output dimension a model produces (e.g. cumulative adopters). | Belongs to a Template. |
| 2 | **SimulationParameter** | A typed, visual-editable input definition (number/percent/currency/integer/select). | Belongs to a Template; instantiated into Scenario parameters. |
| 3 | **SimulationTemplate** | Reusable blueprint binding a model to a parameter schema + default assumptions/constraints. | Has Parameters + Variables; referenced by Scenarios. Built-in or user-saved. |
| 4 | **SimulationAssumption** | A stated assumption with confidence. | Belongs to a Scenario. |
| 5 | **SimulationConstraint** | A bound (`metric op threshold`) the result is validated against. | Belongs to a Scenario; evaluated into ConstraintChecks on a Result. |
| 6 | **SimulationScenario** | A configured, runnable parameter set. | Belongs to a Simulation; references a Template; produces Runs. |
| 7 | **SimulationContributor** | A user with a role on a simulation. | Belongs to a Simulation. |
| 8 | **SimulationVersion** | Immutable snapshot of a simulation's configuration. | Belongs to a Simulation. |
| 9 | **SimulationReview** | A reviewer's structured feedback. | Belongs to a Simulation. |
| 10 | **SimulationApproval** | An approver's sign-off (advances workflow). | Belongs to a Simulation. |
| 11 | **Simulation** | Top-level governed container of scenarios. | Owns Scenarios, Versions, Reviews, Approvals, Contributors. |
| 12 | **SimulationResult** | The output of a single run: KPIs, series, table, risk, sensitivity, constraint checks, distribution. | Embedded in a Run. |
| 13 | **SimulationInsight** | A generated insight/opportunity/risk/warning/decision-support item. | Belongs to a Run (and its Simulation/Scenario). |
| 14 | **SimulationRecommendation** | A generated, acceptable action. | Belongs to a Run. |
| 15 | **SimulationRun** | An execution instance with status, progress, logs, runtime, result. | Belongs to a Scenario + Simulation; has Insights + Recommendations. |
| 16 | **SimulationComparison** | A saved set of runs compared side by side. | References many Runs. |
| 17 | **SimulationDecision** | A recorded decision (adopt/reject/defer/investigate). | References a Simulation + optionally a Run. |
| 18 | **SimulationHistoryEvent** | An audit-trail record of any action. | References Simulation/Scenario/Run + actor. |

Supporting types: `SimulationUser` + `PlatformRole` (RBAC), `Permission`, `SimulationSettings`, and the `WORKFLOW_TRANSITIONS` lifecycle map.

## Lifecycle (workflow state machine)

```
draft → review → approved → scheduled → running → completed → archived
```

Allowed transitions are enforced by `WORKFLOW_TRANSITIONS`:

- **draft** → review, archived
- **review** → approved, draft, archived
- **approved** → scheduled, running, draft, archived
- **scheduled** → running, approved, archived
- **running** → completed, approved, archived
- **completed** → archived, draft
- **archived** → draft

A `SimulationRun` has an independent execution lifecycle:
`queued → running → (paused ⇄ running) → completed | cancelled | failed`.

## Ownership & permissions

- Every `Simulation` has an `ownerId`/`ownerName` and a list of `contributors`
  with roles (`owner`, `editor`, `reviewer`, `viewer`).
- Visibility is one of `private`, `team`, `organization`.
- Platform roles (`admin`, `analyst`, `reviewer`, `viewer`) map to permissions
  (`simulation.create`, `simulation.edit`, `simulation.delete`, `scenario.run`,
  `review.submit`, `approval.record`, `decision.record`, `settings.manage`) via
  `ROLE_PERMISSION_MATRIX`. `can()`, `canView()`, and `canEdit()` enforce access.

## Governance

- **Versioning** — `saveVersion` captures an immutable `SimulationVersion`.
- **Reviews & approvals** — `SimulationReview` and `SimulationApproval` gate the
  workflow; an approval on a `review`-state simulation advances it to `approved`.
- **Constraints** — every result is validated against the scenario's constraints,
  producing `ConstraintCheck[]` with pass/fail.
- **Audit** — every mutating action appends a `SimulationHistoryEvent` (actor,
  timestamp, summary, references), giving a complete, queryable history.

## Persistence

The domain is persisted client-side via the `vendorhub-simulation-os` store
(zustand + `persist`), so a non-technical user's simulations, scenarios, runs,
results, comparisons, decisions, reviews, approvals, versions, and history all
survive reloads with zero backend setup. Server APIs (`/api/simulations*`)
expose the same engine for stateless execution.
