# N.11 — Mandatory User Journey Report

All four mandatory journeys function end-to-end across the public `/platform`
and `/showcase` routes. Both routes are accessible without authentication.

---

## Journey A — Showcase a scenario end-to-end

> Open Showcase → Run Supplier Failure Demo → View End-to-End Story

| Step | Where | How it works |
|------|-------|--------------|
| Open Showcase | `/showcase` | Full-screen, minimal presentation mode |
| Run Supplier Failure | Scenario selector (or `/showcase?scenario=supplier-failure`) | Loads the scenario's story beats |
| View end-to-end story | Beat stepper | Intro → 6 stages (Research→…→Execution) → measured outcome, with prev/next |

## Journey B — Navigate the platform map

> Open Platform Map → Navigate Systems → Understand Dependencies

| Step | Where | How it works |
|------|-------|--------------|
| Open Platform Map | `/platform` → "Platform Map" tab | Visual flow + fabric layers |
| Navigate systems | Subsystem cards | Each links into its in-app surface where one exists |
| Understand dependencies | Dependencies panel | Each subsystem lists what it depends on |

## Journey C — Launch a use case scenario

> Open Use Case Library → Launch Scenario → Track Intelligence Flow

| Step | Where | How it works |
|------|-------|--------------|
| Open Use Case Library | `/platform` → "Use Cases" tab | Eight domain cards (Retail, Commerce, Inventory, Supply Chain, Pricing, Expansion, Operations, Risk Management) |
| Launch scenario | "Launch: …" link → `/showcase?scenario=…` | Opens Showcase on the linked scenario |
| Track intelligence flow | Showcase beats / Demo Scenario Center | Each stage shows action → output across all six subsystems |

## Journey D — Review platform impact

> Open Business Value Dashboard → Review Platform Impact

| Step | Where | How it works |
|------|-------|--------------|
| Open Business Value Dashboard | `/platform` → "Business Value" tab | Seven metric cards with sparklines |
| Review impact | Metric cards | Revenue, Risk Reduction, Decision Quality, Execution Efficiency, Knowledge Reuse, Operational and Strategic Impact |

---

## Verification

- The platform model behind every journey is exercised by
  `tests/unit/platform-realization.test.ts` (17 tests): flow order, scenario
  flow-coverage, use-case→scenario links, value-metric categories, tour
  integrity, and `validatePlatformModel()`.
- Showcase deep-links (`/showcase?scenario=<id>`) are produced by the Use Case
  Library and Demo Scenario Center and consumed by the Showcase page's
  `searchParams`, so Journeys A and C are wired together.

**Conclusion:** Journeys A, B, C and D all function.
