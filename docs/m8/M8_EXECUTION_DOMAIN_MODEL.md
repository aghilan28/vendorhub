# M8.2 — Execution Domain Model

**Source of truth:** `lib/execution/types.ts` (schemas), `lib/execution/workflow.ts`
(lifecycle), `lib/execution/mutations.ts` (ownership, auditability).

All entities share four cross-cutting properties required by M8:

- **Schema** — a typed interface in `types.ts`.
- **Lifecycle** — executable entities advance through the mandatory
  `ExecutionStatus` state machine (Section M8.7).
- **Ownership** — an `ownerId` referencing an `Owner`, set at creation or via
  `applyAssignOwner`.
- **Auditability** — every create/transition/assign/measure/escalate emits an
  immutable, timestamped, owned `ExecutionEvent`.

---

## 1. Entity catalogue

| Entity | Key fields | Lifecycle | Notes |
|--------|-----------|-----------|-------|
| **Program** | code, name, ownerId, sponsorId, initiativeIds, kpiIds, riskIds, dependencyIds | `ExecutionStatus` | Portfolio of initiatives (M8.6) |
| **Initiative** | code, name, programId, ownerId, teamIds, actionPlanIds, kpiIds, decisionId, progress | `ExecutionStatus` | Measurable effort (M8.5) |
| **Project** | name, initiativeId, ownerId, taskIds, milestoneIds | `ExecutionStatus` | Delivery vehicle |
| **ActionPlan** | code, title, priority, ownerId, initiativeId, deadline, progress, links[] | `ExecutionStatus` | Core executable unit (M8.4) |
| **Task** | title, ownerId, actionPlanId, estimateHours, completed | `ExecutionStatus` | Work item |
| **Milestone** | name, dueDate, status, initiativeId | upcoming/at_risk/met/missed | Checkpoint |
| **Owner** | name, role, email, capacity | — | Accountable person |
| **Stakeholder** | name, role, interest (RACI) | — | Informed/consulted party |
| **ExecutionStatus** | enum | — | draft→planned→approved→executing→(blocked)→completed→archived |
| **ExecutionEvent** | entityType, entityId, type, from/toStatus, actorId, timestamp, note | — | Immutable audit record |
| **Outcome** | initiativeId, metric, expected, actual, status | pending/achieved/partial/missed | Expected vs actual (M8.8) |
| **Metric** | name, value, unit | — | Generic measure |
| **KPI** | code, target, current, direction, status, trend[] | on_track/at_risk/off_track | Tracked indicator (M8.9) |
| **Result** | initiativeId, summary, success | — | Captured result |
| **Review** | entityId, reviewerId, rating, notes | — | Periodic review |
| **Retrospective** | initiativeId, wentWell, improve, followUps | — | Post-effort learning |
| **Intervention** | escalationId, action, ownerId | — | Corrective action (M8.10) |
| **Escalation** | title, severity, reason, sourceType/Id, status | open/acknowledged/resolved | Raised issue (M8.10) |
| **ExecutionRisk** | title, likelihood, impact, score, status, mitigation | open/mitigating/closed | Risk register |
| **Dependency** | fromId, toId, type, status | open/satisfied | Inter-entity link |
| **Decision** | title, source, status, approvedBy, activatedInitiativeId, recommendedPriority | pending/approved/activated | Activation source (M8.11) |

## 2. Lifecycle (ExecutionStatus state machine)

```
draft ──▶ planned ──▶ approved ──▶ executing ──▶ completed ──▶ archived
  │          │            │            │  ▲
  └────▶ archived         │            ▼  │
                          └── (blocked ◀──┘)
```

Allowed transitions (`ALLOWED_TRANSITIONS`):

| From | To |
|------|----|
| draft | planned, archived |
| planned | approved, draft, archived |
| approved | executing, planned, archived |
| executing | blocked, completed, archived |
| blocked | executing, archived |
| completed | archived |
| archived | (terminal) |

Transitions are validated by `canTransition()` and executed by `transition()`,
which returns an audited `ExecutionEvent`. Illegal transitions are rejected with
a `WorkflowError` and never mutate state.

## 3. Ownership & permissions

- Every executable entity carries `ownerId`. Reassignment is an audited
  `assigned` event.
- The API surface (`app/api/execution`) is role-gated via
  `requireRole(["ADMIN","SUPER_ADMIN"])`, consistent with other operational
  endpoints (`app/api/operations/health`).
- The workspace is an internal admin surface (`app/(admin)/admin/execution`).

## 4. Auditability

`ExecutionEvent` records: `created`, `transition`, `assigned`, `linked`,
`outcome_recorded`, `kpi_measured`, `escalated`, `intervention`, `review`,
`decision_activated`. Each carries actor identity and an ISO timestamp. Events
are prepended to `ExecutionDataset.events` so the activity stream is reverse
chronological.

## 5. Determinism

The engine is dependency-free and deterministic: `buildSeedDataset()` returns a
reproducible dataset and all analytics (`buildExecutionSnapshot`) are pure
functions of the dataset. This makes the model fully unit-testable
(`tests/unit/m8-execution.test.ts`).
