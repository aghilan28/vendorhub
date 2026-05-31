# EC-5 Phase 6 — Simulation Impact Certification

**Source:** `lib/marketplace-intelligence/simulation.ts`, `activateToSimulation` in `activation.ts`.

| Aspect | Status | Evidence |
|--------|--------|----------|
| Scenario generation | ✅ REAL | `buildScenario(kind, opts)` — demand_surge/promotion/price_change/stockout_shock/growth_expansion |
| Forecasting | ✅ REAL | `runMarketplaceScenario(fabric, scenario)` projects forward on live fabric |
| Optimization | ✅ REAL | scenario kinds for price_change/promotion model optimization options |
| Decision support | ✅ REAL | `activateToSimulation(rec, fabric)` ties a recommendation to a scenario outcome |
| Risk evaluation | ✅ REAL | stockout_shock scenario surfaces stockout risk |
| Outcome comparison | ✅ REAL | `ScenarioOutcome` returned for comparison |

## Do simulations influence decisions, or merely exist?
**INFLUENCE.** `activateToSimulation` is invoked from the unified `activateRecommendation` dispatcher when `rec.activation === "simulation"`. A growth/price/stockout recommendation derives a scenario kind (`scenarioKindFor`) and runs it against the **live fabric**, producing an outcome that informs the decision.

## Executed evidence
- `mcp0e-marketplace-intelligence.test.ts` "simulation on live fabric" — projects a demand surge forward and surfaces stockout risk.
- `ec5-intelligence-impact.test.ts` — a `growth_opportunity` recommendation → `activateToSimulation` → scenario + outcome (non-null).

**Status: PASS — simulations influence decisions (not merely exist).**
