# M7.12 — Product Analytics Report

Phase: KARTEX M7
Source: `features/workspace/hooks.ts → useProductAnalytics` and
`features/workspace/components/analytics.tsx` (`/workspace/analytics`).

Analytics are computed live from the workspace store plus the Simulation, SECIS,
Governance, and Intelligence stores.

## Metrics delivered

| Metric | Definition |
| --- | --- |
| **Task completion** | done tasks ÷ total tasks. |
| **Open tasks** | tasks not done. |
| **Approval velocity** | governance decisions resolved (approved/rejected) ÷ total. |
| **Workflow completion** | intelligence workflows complete ÷ total. |
| **Simulation usage** | simulation runs executed. |
| **Research usage** | research-stage canonical nodes. |
| **Knowledge usage** | knowledge-stage canonical nodes. |
| **Governance usage** | decisions + policies. |
| **Notifications / unread** | notification volume and unread count. |
| **Usage by system** | activity volume across Research/Knowledge/Simulation/SECIS/Governance. |
| **Active projects** | projects in the active state. |

## Dashboards

- **Analytics** (`/workspace/analytics`): KPI tiles (task completion, approval
  velocity, workflow completion, active projects; plus per-system usage tiles)
  and two bar charts (usage by system; engagement).
- **Home** (`/workspace`): a System Health strip summarizing usage by system,
  linking to the analytics page.

## Properties

- **Live** — memoized selectors recompute as the underlying stores change.
- **Cross-system** — a single analytics surface spans all five systems plus the
  workspace layer, rather than per-system metrics.
- **No placeholders** — every value derives from real seeded/created state.
