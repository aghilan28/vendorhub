# M7.2 — Unified Workspace Model

Phase: KARTEX M7 — Intelligence Workspace & User Experience Platform
Source of truth: `lib/workspace/types.ts`

A personal layer on top of the integrated platform. It references the underlying
systems (via `CrossRef`) rather than duplicating them.

## Entities

| Entity | Role |
| --- | --- |
| **Workspace** | The container for a user's projects, tasks, and preferences. |
| **Project** | Groups an initiative's cross-system work (`CrossRef[]` to Simulation/SECIS/Governance/Intelligence items) with status, progress, owner, and tags. |
| **Task** | A unit of work with assignee, status (`todo/in_progress/blocked/done`), priority, optional system + deep-link route, and optional project. |
| **Action** (derived) | Anything awaiting the user — reviews, approvals, pending simulations/decisions/governance actions, and tasks — aggregated across systems. |
| **Insight** (derived) | Surfaced via the Inbox from simulation insights and cross-system signals. |
| **Notification** | A platform event (`event/approval/review/failure/recommendation/insight`) with read state and a deep link. |
| **Assignment** | Modeled as a Task's `assigneeId`/`assigneeName`. |
| **Review / Approval** (derived) | Surfaced in the Action Center/Inbox from the underlying Governance decisions. |
| **Dashboard** | The Intelligence Home (`/workspace`) composed from the above. |
| **Favorites** | Pinned quick-access links. |
| **Bookmarks** | Saved links to specific items in any system. |
| **Recent Activity** (derived) | A merged cross-system feed (`ActivityItem[]`). |

Supporting: `CrossRef` (system + refId + refRoute + label), `SavedSearch`,
`Preferences`, `WorkspaceUser` + `WorkspaceRole` (RBAC), `ProductAnalytics`.

## CrossRef — the integration primitive

```ts
interface CrossRef { system: RefSystem; refId: string; refRoute: string; label: string }
```

Every project link and task can point at a real item in any of the five systems
or the M6 intelligence spine. The seeded projects wrap the real M6 workflows and
items (`sim_pricing`, `ce-supplier`, `dec-pricing`, `dec-backup`), so a project is
the user-facing wrapper over cross-system lineage.

## Derived, not duplicated

The Action Center, Inbox, Activity Timeline, and Search are computed live by
**aggregation hooks** that read the Simulation, SECIS, Governance, and
Intelligence stores plus the workspace store — so the workspace reflects the real
state of the platform without copying it.

## Ownership & permissions

Four workspace roles (`lead`, `analyst`, `reviewer`, `viewer`) map to
`project.manage`, `task.manage`, and `preferences.manage`. Per-system actions
remain governed by each system's own RBAC.

## Persistence

`store/workspace-store.ts` (zustand + `persist`, key `vendorhub-workspace`) holds
projects, tasks, notifications, bookmarks, favorites, saved searches, and
preferences — seeded to wrap the real M6 workflows and cross-system items.
