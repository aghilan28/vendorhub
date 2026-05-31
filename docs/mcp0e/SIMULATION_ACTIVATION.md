# Simulation Activation (MCP-0E.11)

**Module:** `lib/marketplace-intelligence/simulation.ts` (+ `activation.ts → activateToSimulation`)

## Scenarios on LIVE state
`runMarketplaceScenario(fabric, scenario)` projects forward on the **live fabric** (real per-product velocity, price, stock) — not abstract demo state. Scenario kinds (`buildScenario`):

| Kind | Demand × | Price Δ% |
|---|---|---|
| `demand_surge` | 1.5 | 0 |
| `demand_drop` | 0.6 | 0 |
| `stockout_shock` | 2.0 | 0 |
| `price_change` | 1.0 | +5 |
| `promotion` | 1.3 | −10 |
| `growth_expansion` | 1.25 | 0 |

## Model
Bounded price elasticity (−0.5 unit-% per +1 price-%) → `unitsFactor`. Per product over the horizon (default 30d): projected demand, projected revenue (× price factor), and projected stockouts (available < projected demand). Returns baseline vs projected with `unitsPct` / `revenuePct` / `stockoutsDelta` and a plain-language `risks[]` (e.g. "N additional stockouts", "revenue declines X%").

## Activation
`activateToSimulation(rec, fabric)` derives a scenario from the recommendation (growth → demand_surge, promotion → promotion, price → price_change, stockout → stockout_shock) and runs it scoped to the recommendation's category when applicable. Marketplace-scoped and category-scoped recommendations are routed here by `assembleRecommendations`.

## Verified
Tests assert a demand surge increases projected units and can raise stockout count, and a promotion lifts projected units — both computed from the sample fabric's real numbers.
