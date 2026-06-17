# M4.15 — Mandatory User Journeys Report

Phase: KARTEX M4 — SECIS

All five mandatory journeys function end to end against real, persisted state.

## Journey A — Supplier failure → impact → propagation → recommendations

1. **Create** a supplier-failure event in the Change Event Studio
   (`/secis/change-events`): pick the type, choose an origin supplier, set
   magnitude — the live preview shows the blast radius instantly.
2. **Run impact analysis** with "Save & analyze" → routes to the change-event
   detail page.
3. **View propagation** — the Propagation Engine renders the visual node-link
   graph (origin → hops), affected systems/entities, paths, severity, and the
   impact timeline.
4. **View recommendations** — generated mitigations/interventions appear in the
   Recommendations card; accept them inline.

## Journey B — Demand surge → inventory impact → mitigation

1. **Create** a demand-surge event originating at a category/segment.
2. **Analyze inventory impact** — the Impact Studio (`/secis/impact?event=…`)
   shows the inventory dimension score, revenue-at-risk by system, and the
   affected inventory nodes.
3. **Generate mitigation** — apply a mitigation (e.g. release safety stock /
   demand shaping) from the detail page; it is tracked and audited.

## Journey C — Entity Explorer → dependencies → influence

1. **Open Entity Explorer** (`/secis/entities`) and select an entity.
2. **View dependencies** — the panel lists upstream producers and downstream
   dependents; add or remove links inline.
3. **Analyze influence** — the influence score, influence reach, and dependency
   reach quantify how central the entity is to the network.

## Journey D — Evolution analysis → compare recovery paths → select intervention

1. **Run evolution analysis** in the Evolution Studio
   (`/secis/evolution?event=…`): select interventions and run — the run
   progresses live and produces a recovery result.
2. **Compare recovery paths** — run a no-action baseline and an intervention
   run, then open the Comparison Engine (`/secis/compare`) to overlay their
   health curves and KPIs.
3. **Select an intervention** — the comparison highlights the most resilient,
   cost-effective option; save it as a scenario.

## Journey E — Review risks → approve mitigation → archive event

1. **Review risks** in the Risk Center (`/secis/risk`): inspect the registry,
   critical risks, and scores per event.
2. **Approve** — move an event to `review` in the Workflow Engine, then approve
   it (advances to `approved`); apply/verify the mitigation.
3. **Archive** the event via the workflow once handled. Every step is recorded
   in the History & Audit Center.

## Verification

- `next build` compiles all journey routes.
- `tests/unit/secis.test.ts` validates propagation, impact, risk, evolution,
  recommendations, and RBAC that these journeys depend on.
- The persisted store guarantees work created in any journey survives reloads
  and is visible across every screen.
