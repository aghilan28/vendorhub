# M3.14 — Mandatory User Journeys Report

Phase: KARTEX M3 — Simulation Operating System

All five mandatory journeys function end to end against real, persisted state.
Each step below maps to a concrete screen and action.

## Journey A — Create → Configure → Run → View Results

1. **Create scenario** — `/simulations/scenarios` → "New scenario" (or pick a
   template at `/simulations/templates`).
2. **Add parameters** — visual sliders/inputs in the Scenario Builder; the live
   preview re-runs the model as you type.
3. **Run simulation** — "Save & run" launches a run and routes to the Execution
   Center, where it progresses live to completion.
4. **View results** — open the run in the Analysis Studio (`/simulations/results
   ?run=…`) to see KPIs, charts, risk, sensitivity, constraint checks, table,
   insights, and recommendations.

## Journey B — Clone → Modify Assumptions → Compare

1. **Clone scenario** — "Clone" on any scenario card opens the copy in the builder.
2. **Modify assumptions** (and parameters/constraints) — edit and "Save & run".
3. **Compare** — from a result, "Compare" pre-selects the run; pick the original
   run in the Comparison Engine to see a side-by-side KPI/risk/outcome diff and a
   recommended option.

## Journey C — Analysis Studio → Review Insights → Export Recommendations

1. **Open Analysis Studio** — `/simulations/results` → select a completed run.
2. **Review insights** — the Insights panel + `/simulations/insights` show
   generated opportunities, risks, warnings, and decision support.
3. **Export recommendations** — "Export" downloads the run (result + insights +
   recommendations) as JSON; "Share" copies a summary to the clipboard;
   recommendations can be **accepted** and tracked.

## Journey D — Review → Approve → Execute → Archive

1. **Review simulation** — move a simulation to `review` (Workflow Engine), then
   in `/simulations/reviews` submit structured feedback.
2. **Approve** — record an approval, which advances the simulation to `approved`.
3. **Execute** — transition `approved → running` and run its scenarios.
4. **Archive** — transition to `archived` once complete. Every step is logged.

## Journey E — History → Compare Past Runs → Track Decisions

1. **Open History** — `/simulations/history` shows the full timestamped audit
   timeline (filterable by simulation).
2. **Compare past runs** — "Compare past runs" links to the Comparison Engine.
3. **Track decisions** — the History Center's Decisions section (and the
   per-simulation detail page) tracks every recorded decision and outcome.

## Verification

- `next build` compiles all journey routes.
- `tests/unit/simulation-os.test.ts` validates the engine, constraints,
  insights, comparison, and RBAC that these journeys depend on.
- The persisted store guarantees that work created in any journey survives
  reloads and is visible across every screen.
