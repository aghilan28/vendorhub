# M3.3 — Information Architecture

Phase: KARTEX M3 — Simulation Operating System

The Simulation OS lives under the `(simulation)` route group with a dedicated
sidebar + header. All routes exist, are reachable, and render real, persisted
data. Routes that read query params are wrapped in a `Suspense` boundary.

## Route map

| Route | Screen | Section | Status |
| --- | --- | --- | --- |
| `/simulations` | Command Center | M3.4 | ✅ |
| `/simulations/templates` | Templates browser | M3.3 catalog | ✅ |
| `/simulations/scenarios` | Scenario Builder (+ list, edit, clone, archive, delete) | M3.5 | ✅ |
| `/simulations/runs` | Execution Center | M3.6 | ✅ |
| `/simulations/results` | Result Analysis Studio | M3.7 | ✅ |
| `/simulations/compare` | Comparison Engine | M3.8 | ✅ |
| `/simulations/insights` | Insight Generation Center | M3.9 | ✅ |
| `/simulations/recommendations` | Recommendations | M3.9 | ✅ |
| `/simulations/workflows` | Workflow Engine | M3.11 | ✅ |
| `/simulations/reviews` | Reviews & Approvals | M3.13 | ✅ |
| `/simulations/history` | Simulation History Center | M3.10 | ✅ |
| `/simulations/settings` | Settings & Security | M3.13 | ✅ |
| `/simulations/[id]` | Simulation detail | cross-cutting | ✅ |

Analytics (M3.12) is surfaced as a dedicated dashboard panel on the Command
Center and reused metrics across History and Workflows.

## Query parameters (deep-linking)

- `/simulations/scenarios?template=<id>` — start a new scenario from a template.
- `/simulations/scenarios?scenario=<id>` — edit an existing scenario.
- `/simulations/scenarios?sim=<id>` — attach a new scenario to a simulation.
- `/simulations/results?run=<id>` — open the Analysis Studio for a run.
- `/simulations/compare?add=<runId>` — pre-select a run for comparison.
- `/simulations/history` — filter by simulation.

## Navigation

`lib/constants/navigation.ts → simulationNavigation` defines the 12 sidebar
entries. The `(simulation)/layout.tsx` renders:

- `DashboardSidebar` (desktop) + a hydration-safe mobile drawer.
- `SimulationHeader` with an acting-user / role switcher (to demonstrate RBAC).
- `ExecutionRunner` — a mounted-once controller that advances live runs across
  every route so progress continues regardless of the open page.

## Server API surface

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/simulations` | GET | Catalog: categories + templates. |
| `/api/simulations/scenarios` | GET | Starter scenario definition for a template. |
| `/api/simulations/run` | POST | Execute a model deterministically; returns result + insights + recommendations. |

## Reachability

The production build (`next build`) compiles and renders all 13 routes (12
static + 1 dynamic `[id]`). Static segments (`templates`, `runs`, …) take
precedence over the dynamic `[id]` segment, so there is no routing collision.
