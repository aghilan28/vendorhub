# Pricing Intelligence Engine (MCP-0E.5)

**Module:** `lib/marketplace-intelligence/pricing.ts` → `analyzePricing(fabric): PricingIntelligence`

Operates on fabric price / margin / discount / velocity / inventory.

## Margin model
Cost is not stored on products, so the fabric assumes `cost = MRP × 0.6` (`ASSUMED_COST_RATIO`) and `marginPct = (price − cost) / price`. The assumption is consistent across the engine and documented; a negative margin means the listed price is below assumed cost.

## Recommendations (per product)
| Recommendation | Trigger | Revenue / margin estimate |
|---|---|---|
| `raise` (restore) | margin < 0 (below cost) | −2% rev / +(\|margin\|+5)% margin |
| `raise` (headroom) | strong demand, < 5% discount, margin ≥ 25%, cover < 30d | +3% rev / +5% margin |
| `promote` | no demand but in stock & published | +8% rev / −4% margin |
| `discount` | days-of-cover ≥ 60 (overstock) | +6% rev / −3% margin |
| `hold` | otherwise (not surfaced) | 0 / 0 |

## Outputs
`signals[]` (ranked by absolute impact), `averageMarginPct`, `belowMarginCount`, and `promotionGuidance[]` (slow-mover coupons, no-sale categories, below-margin caution).

## Verified behaviour (sample)
- `p5` (Jeans): price 200 vs cost 240 → margin −20% → **raise (restore)**.
- `p6` (Earbuds): 40% margin, no discount, healthy demand → **raise (headroom)**.
- `p7` (Charger): 200 days cover → **discount**.
