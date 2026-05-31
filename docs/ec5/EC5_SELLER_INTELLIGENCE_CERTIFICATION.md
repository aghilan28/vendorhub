# EC-5 Phase 2 — Seller Intelligence Certification

**Source:** `features/merchant-intelligence/engine.ts`, `lib/marketplace-intelligence/{demand,inventory,pricing}.ts`, `/seller/intelligence`, `/api/seller/intelligence`, `lib/seller-os/`.

For each capability: **1) Exists? 2) Visible? 3) Actionable? 4) Changes behavior?**

| Capability | Exists | Visible | Actionable | Changes behavior | Evidence |
|-----------|--------|---------|------------|------------------|----------|
| Demand forecasting | ✅ | ✅ | ✅ | ✅ | `analyzeDemand(fabric)`; rec `demand_forecast` → execution |
| Inventory forecasting | ✅ | ✅ | ✅ | ✅ | `analyzeInventory` (days-of-cover, reorder) |
| Stock-out prediction | ✅ | ✅ | ✅ | ✅ | rec `stockout_risk` → `activateToExecution` (Journey C) |
| Pricing intelligence | ✅ | ✅ | ✅ | ✅ | `analyzePricing` (below-cost lift, headroom); rec `price_optimization` |
| Revenue forecasting | ✅ | ✅ | ✅ | ⚠️ advisory | merchant-intelligence engine revenue projection |
| Store health | ✅ | ✅ | ✅ | ✅ | merchant-intelligence health score (`getSellerOperationalSnapshot`) |
| Seller recommendations | ✅ | ✅ | ✅ | ✅ | `assembleRecommendations` ranked + routed |
| Expansion opportunities | ✅ | ✅ | ✅ | ⚠️ advisory | hyperlocal + growth intelligence |
| Risk alerts | ✅ | ✅ | ✅ | ✅ | operational-intelligence risk detection |
| Operational recommendations | ✅ | ✅ | ✅ | ✅ | `lib/marketplace-operations/intelligence.ts` |

## Behavior-change proof (executed)
`ec5-intelligence-impact.test.ts`: a real seller recommendation (`stockout_risk`/`price_optimization`) → `activateToExecution` → Initiative + ActionPlan. The recommendation does not merely display; it produces an executable action with lineage.

## Visible surfaces
`/seller/intelligence` (daily briefing), `/seller/operations` (8-tab cockpit), `/api/seller/intelligence` (live snapshot).

**Status: PASS** — seller intelligence exists, is visible, actionable, and changes behavior (advisory-only for revenue/expansion forecasts, which is appropriate).
