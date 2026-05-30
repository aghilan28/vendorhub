# N — Platform Realization Report

Maps every Phase N directive section to the shipped artifact and its location.

---

## Deliverables matrix

| # | Deliverable | Section | Implementation |
|---|-------------|---------|----------------|
| 1 | Platform Audit | N.1 | `docs/n/N_PLATFORM_AUDIT.md` |
| 2 | Platform Map | N.2 | `features/platform/components/platform-map.tsx`, `docs/n/N_PLATFORM_MAP.md` |
| 3 | Platform Tour | N.3 | `features/platform/components/platform-tour.tsx` (+ `lib/platform/tours.ts`) |
| 4 | Demo Scenario Center | N.4 | `features/platform/components/demo-scenario-center.tsx` (+ `lib/platform/scenarios.ts`) |
| 5 | Showcase Mode | N.5 | `app/(public)/showcase/page.tsx`, `features/platform/components/showcase-mode.tsx` |
| 6 | Value Explanation Center | N.6 | `features/platform/components/value-explanation.tsx` |
| 7 | Intelligence Storyboard | N.7 | `features/platform/components/intelligence-storyboard.tsx` |
| 8 | Business Value Dashboard | N.8 | `features/platform/components/business-value-dashboard.tsx` (+ `lib/platform/value.ts`) |
| 9 | Use Case Library | N.9 | `features/platform/components/use-case-library.tsx` (+ `lib/platform/usecases.ts`) |
| 10 | Documentation Hub | N.10 | `features/platform/components/documentation-hub.tsx` (+ `lib/platform/docs.ts`) |
| 11 | User Journey Report | N.11 | `docs/n/N_USER_JOURNEY_REPORT.md` |
| 12 | Platform Realization Report | — | this document |
| 13 | Phase N Certification Report | — | `docs/n/N_CERTIFICATION_REPORT.md` |

## Architecture

```
lib/platform/                  deterministic platform model (single source of truth)
  types.ts                     Subsystem, FlowStage, DemoScenario, UseCase, ValueMetric, Tour, DocSection
  subsystems.ts                8 subsystems (M1–M8) + derived intelligence flow
  scenarios.ts                 7 end-to-end demo scenarios (each covers all 6 stages)
  usecases.ts                  8 use cases linked to scenarios
  value.ts                     7 business value metrics
  tours.ts                     complete tour + per-subsystem tours (derived)
  docs.ts                      6 documentation sections
  index.ts                     getPlatformModel(), lookups, validatePlatformModel()

features/platform/components/  public presentation UI
  platform-hub.tsx             /platform hub (hero + 8 tabs)
  platform-map.tsx             N.2
  intelligence-storyboard.tsx  N.7
  value-explanation.tsx        N.6
  business-value-dashboard.tsx N.8
  demo-scenario-center.tsx     N.4
  use-case-library.tsx         N.9
  platform-tour.tsx            N.3
  documentation-hub.tsx        N.10
  showcase-mode.tsx            N.5
  shared.tsx                   icon resolution + accent theming + sparkline

app/(public)/platform/page.tsx  public route /platform
app/(public)/showcase/page.tsx  public route /showcase (reads ?scenario=)
lib/constants/navigation.ts     "Platform" admin nav entry (in-app discovery)
tests/unit/platform-realization.test.ts  17 deterministic tests
```

## Design decisions

1. **Public by default.** The audience (judges, investors, faculty, customers)
   has no operator login, so `/platform` and `/showcase` live in the `(public)`
   route group and render in the clean root layout.
2. **Model-driven, not hard-coded screens.** Every surface reads one
   deterministic model (`lib/platform`), so the map, storyboard, scenarios and
   docs can never drift from each other and are fully unit-testable.
3. **One hub + one stage.** `/platform` is the explorable hub; `/showcase` is the
   distraction-free presentation stage. Use Case Library and Demo Scenario
   Center deep-link into Showcase (`?scenario=<id>`), connecting exploration to
   presentation.
4. **Conventions preserved.** Reuses existing primitives (`PageContainer`,
   `Tabs`, `Select`, `Button`, `Badge`, `polished-surface`/`operational-surface`
   classes, brand tokens) and the `@/` alias.

## What a newcomer can do

- Read the hero and **understand what KARTEX is** in one screen.
- Open the **Platform Map** to see the eight subsystems and their dependencies.
- Read the **Storyboard** to follow the flow visually.
- Open **Value Explanation** to learn what/why/problem/value/who per subsystem.
- Run a **Demo Scenario** end-to-end, or jump into **Showcase Mode** to present.
- Browse the **Use Case Library** by domain and launch a scenario.
- Review the **Business Value Dashboard** for impact in business terms.
- Take a **Guided Tour** (per subsystem or the complete platform).
- Read the **Documentation Hub** (architecture, capabilities, workflows, etc.).
