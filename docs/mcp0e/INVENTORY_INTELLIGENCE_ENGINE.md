# Inventory Intelligence Engine (MCP-0E.4)

**Module:** `lib/marketplace-intelligence/inventory.ts` → `analyzeInventory(fabric): InventoryIntelligence`

Operates on fabric inventory + sales velocity (the demand signal).

## Risk classification (per product)
| Risk | Trigger |
|---|---|
| `stockout` | available ≤ 0 with demand, **or** days-of-cover ≤ 3 |
| `watch` | days-of-cover ≤ 7 |
| `overstock` | days-of-cover ≥ 60 (`OVERSTOCK_COVER_DAYS`) |
| `dead_stock` | velocity 0 with stock > 3× low-stock threshold, or OOS with no demand |
| `healthy` | otherwise |

## Reorder math
- `reorderPoint = max(lowStockThreshold, ceil(velocity × LEAD_TIME_DAYS))` (`LEAD_TIME_DAYS = 5`).
- `suggestedReorder = max(0, ceil(velocity × 14) − available)` for stockout/watch (14-day target cover).

## Outputs
`signals[]` (sorted by urgency), `healthScore` (0–100, penalised by stockout/dead/overstock shares), `stockoutCount`, `overstockCount`, `reorderUnits` (Σ suggested reorder).

## Verified behaviour (sample)
- `p8` (Speaker): available 0, demand present → **stockout**, suggested reorder **14**.
- `p3` (Spinach): no demand, high stock → **dead_stock**.
- `p5`/`p7`: high days-of-cover → **overstock**.
