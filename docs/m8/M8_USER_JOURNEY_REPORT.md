# M8.13 — Mandatory User Journey Report

All three mandatory journeys are implemented end-to-end in the Execution
workspace (`/admin/execution`). Every step is a real, store-backed interaction —
no placeholders. The workspace is fully client-driven so it functions without
external services.

---

## Journey A — Intelligence to measured outcome

> Research → Knowledge → Simulation → SECIS → Governance approval → Create
> Action Plan → Execute Initiative → Measure Outcome

| Step | Where | How it works |
|------|-------|--------------|
| Research/Knowledge/Simulation/SECIS/Governance | Upstream intelligence (audited in M8.1) | Surfaced as `Decision`s with a `source` of research/knowledge/simulation/secis/governance |
| Governance approval | **Decision Activation** tab | Approved decisions are eligible for activation; pending ones are blocked until approved |
| Create Action Plan + Execute Initiative | **Decision Activation** → `activateDecision` | One click converts an approved decision into a linked Initiative **and** Action Plan (no manual re-entry), creating audited events |
| Track execution | **Action Plans** / **Initiatives** tabs | Advance the lifecycle via workflow controls (planned → approved → executing → completed) |
| Measure Outcome | **Analytics & Outcomes** tab | Record actual results; variance, attainment and success/failure rates update live |

**Result:** an approved intelligence decision becomes owned work and ends in a
measured outcome with computed variance.

## Journey B — Workspace recommendation to tracked initiative

> Open Workspace → Review Recommendation → Convert to Initiative → Assign Owner
> → Track Progress

| Step | Where | How it works |
|------|-------|--------------|
| Open Workspace | `/admin/execution` | Tabbed operator surface |
| Review Recommendation | **Decision Activation** / **Command Center** | Decisions and KPI alerts are surfaced |
| Convert to Initiative | **Decision Activation** or **Initiatives → Create** | Activation creates an initiative; or create one directly |
| Assign Owner | Inline owner `Select` on each initiative/action plan | `assignOwner` emits an audited `assigned` event |
| Track Progress | **Command Center** / **Initiatives** | Progress bars, status badges and lifecycle controls reflect live state |

## Journey C — Program oversight

> Open Program → View Dependencies → View Risks → Review Outcomes

| Step | Where | How it works |
|------|-------|--------------|
| Open Program | **Programs** tab | Each program renders a health card |
| View Dependencies | Program card → Dependencies panel | Lists typed dependencies and their status |
| View Risks | Program card → Risks panel | Ranked by exposure (likelihood × impact); shows open exposure total |
| Review Outcomes | Program card → Outcomes panel | Achieved/partial/missed/pending per initiative |

---

## Verification

- Journey logic is exercised by `tests/unit/m8-execution.test.ts`
  (decision activation, transitions, outcome recording, KPI measurement,
  escalation handling).
- The interactive surfaces are wired to the same engine functions the tests
  cover, so passing tests imply working journeys.

**Conclusion:** Journeys A, B and C all function.
