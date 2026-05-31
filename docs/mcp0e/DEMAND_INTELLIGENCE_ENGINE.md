# Demand Intelligence Engine (MCP-0E.3)

**Module:** `lib/marketplace-intelligence/demand.ts` → `analyzeDemand(fabric): DemandIntelligence`

Operates on the fabric (orders, behaviour, inventory) — never demo data.

## Forecasts
Per **product / category / store / marketplace**:
- `dailyRunRate` = per-day velocity from the fabric window.
- `expectedUnits7d` / `expectedUnits30d` = run-rate × horizon.
- `trend` = relative demand momentum **within the product's category** (rising ≥ 1.2× category-average velocity; declining ≤ 0.6×; else flat) — a cross-sectional signal that needs no historical series.
- `confidence` (0–100) scales with units sold, review volume and presence of behavioural signals.

## Signals
- **Opportunity (surge):** a product selling with < 7 days of cover — demand outpacing supply.
- **Risk (dead demand):** a published, in-stock product with zero sales in the window.
- **Trend:** the top category by revenue share.

## Marketplace roll-up
`marketplaceRunRate` (Σ product velocity) and `marketplaceForecast30d` feed the Admin center and the seller briefing.

## Verified behaviour (sample)
- `p1` (Tomatoes): 5/day, 4 days cover → **surge opportunity**.
- `p3` (Spinach): published, in stock, 0 sales → **dead-demand risk**.
- Forecasts emitted at all four scopes (asserted in `tests/unit/mcp0e-marketplace-intelligence.test.ts`).
