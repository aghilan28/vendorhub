# O.3 — User Journey Certification

All five mandatory journeys are traceable through built routes and the
deterministic platform/execution models (unit-tested). Public journeys need no
login; operator journeys use the admin workspace.

---

## Journey A — Full intelligence flow
> Research → Knowledge → Simulation → SECIS → Governance → Execution

- **Surface:** `/showcase` (any scenario) and `/platform` Storyboard/Scenarios.
- **Mechanism:** every demo scenario contains exactly six ordered stages
  matching this flow (asserted in tests). Stage 5 (Governance) → stage 6
  (Execution) mirrors the real M8 decision-activation path.
- **Status:** ✅ functions.

## Journey B — Workspace to outcome
> Workspace → Recommendation → Decision → Initiative → Outcome

- **Surface:** `/admin/dashboard` → `/admin/execution`.
- **Mechanism:** Execution OS "Decision Activation" converts an approved decision
  into an initiative + action plan (no re-entry); outcomes are recorded with
  variance/attainment. Covered by `tests/unit/m8-execution.test.ts`.
- **Status:** ✅ functions.

## Journey C — Tour to showcase
> Platform Tour → Demo Scenario → Showcase

- **Surface:** `/platform` (Guided Tours, Demo Scenarios) → `/showcase?scenario=…`.
- **Mechanism:** the Complete Platform Tour ends by directing to Showcase; Demo
  Scenario Center and Use Case Library deep-link into `/showcase?scenario=<id>`.
- **Status:** ✅ functions.

## Journey D — Search-led discovery
> Search → Knowledge → Simulation → Governance

- **Surface:** `/platform` "Search" tab (unified platform search, O.7).
- **Mechanism:** `searchPlatform()` reaches subsystems (Knowledge, Simulation,
  Governance, …), scenarios, use cases, metrics, tours and documents; each
  result links to the relevant surface. Covered by `tests/unit/phase-o-completion.test.ts`.
- **Status:** ✅ functions.

## Journey E — Risk event to outcome
> Risk Event → SECIS → Decision → Action Plan → Outcome

- **Surface:** `/showcase?scenario=supplier-failure` (and `logistics-disruption`);
  operator side in `/admin/execution` (escalations → interventions → outcomes).
- **Mechanism:** the Supplier Failure / Logistics Disruption scenarios begin with
  a risk trigger, pass through SECIS validation (stage 4), Governance decision
  (stage 5) and Execution action plan + measured outcome (stage 6). Execution's
  escalation→intervention→outcome path is unit-tested.
- **Status:** ✅ functions.

---

## Evidence
- Journeys A, C, D, E ride on `lib/platform` (validated by `validatePlatformModel()`
  and Phase N/O tests).
- Journeys B and E (operator side) ride on `lib/execution` (28 M8 tests).
- All host routes build (see O_ROUTE_CERTIFICATION.md).

**Verdict:** Journeys A–E all function. ✅ PASS.
