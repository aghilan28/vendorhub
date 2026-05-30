# M3.12 — Simulation Analytics Report

Phase: KARTEX M3 — Simulation Operating System
Source: `features/simulation/hooks.ts → useSimulationAnalytics` and
`features/simulation/components/analytics-panel.tsx`.

The analytics layer is computed live from the persisted store and rendered as
dashboards on the Command Center (and reused across History/Workflows).

## Metrics delivered

| Metric | Definition |
| --- | --- |
| **Runs** | Total runs ever executed. |
| **Scenarios** | Total + active scenarios. |
| **Success rate** | Completed ÷ finished (completed + failed + cancelled). |
| **Failure rate** | (Failed + cancelled) ÷ finished. |
| **Average runtime** | Mean runtime across completed runs. |
| **Recommendation acceptance** | Accepted ÷ total recommendations. |
| **Decision impact** | Count of high-impact decisions. |
| **Scenario coverage** | % of active scenarios with ≥1 completed run. |
| **Runs by model** | Distribution of runs across the 6 models. |
| **Runs by category** | Distribution across simulation categories. |
| **Run throughput** | Recency-bucketed run trend (sparkline). |
| **Live / pending** | Running runs, pending reviews, pending approvals. |

## Dashboards

- **Command Center** (`/simulations`): KPI tiles (simulations, runs, success
  rate, avg runtime, coverage, insights, pending reviews, decisions), a run
  activity chart, a workflow overview, and the dedicated **Analytics Panel**
  (runs-by-model bars, throughput chart, runs-by-category, acceptance, coverage).
- **History Center**: event volume + decisions tracked.
- **Workflow Engine**: simulation counts per lifecycle state.

## Properties

- **Live** — derived via memoized selectors; updates instantly as runs complete.
- **Deterministic** — backed by the deterministic engine, so the same inputs
  reproduce the same analytics.
- **No placeholders** — every number is computed from real store state seeded
  with engine-produced demo data.
