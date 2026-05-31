# MCP-0E User Journey Report (MCP-0E.13)

All five mandatory journeys function and are covered by `tests/unit/mcp0e-marketplace-intelligence.test.ts`.

## Journey A — Marketplace Activity → Detection → Recommendation → Execution
Activity (orders/inventory) → `buildMarketplaceFabric` → engines → `assembleRecommendations` → pick an execution recommendation → `activateToExecution` → **Initiative + Action Plan** with `links[0].source === "commerce"`, decision `status === "activated"`. ✅

## Journey B — Demand Surge → Forecast → Inventory Alert → Seller Action
`p1` shows a demand opportunity signal, an inventory `watch`/low-cover signal, and a corresponding recommendation — the surge is visible across demand, inventory and the action list, and surfaces in the Seller Briefing. ✅

## Journey C — Stockout Risk → Recommendation → Approval → Resolution
`p8` (available 0, live demand) → `stockout_risk` recommendation (`critical`) → `activateToExecution` → decision `activated`, initiative `planned` (a resolvable unit of work). ✅

## Journey D — Trust Risk → Detection → Governance → Resolution
Flagged reviews + open disputes + a high-cancellation seller → `trust_risk` / `seller_risk` recommendations (activation `governance`) → `activateToGovernance` → `RiskSignal` + recommended `enforcement` + reversibility. ✅

## Journey E — Admin → Marketplace Insight → Initiative → Outcome
Admin center exposes insights + health; a growth recommendation activates into an execution initiative via `activateRecommendation`. Outcome tracking continues in the Execution OS (KPIs/outcomes). ✅

## Surfaces exercised
- `/admin/intelligence` (admin command center)
- `/seller/intelligence` (daily briefing)
- `/discover` (buyer smart discovery)
