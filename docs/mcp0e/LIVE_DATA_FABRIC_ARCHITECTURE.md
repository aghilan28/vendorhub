# Live Marketplace Data Fabric (MCP-0E.2)

**Module:** `lib/marketplace-intelligence/fabric.ts` → `buildMarketplaceFabric(input): MarketplaceFabric`

## Purpose
A single normalized, indexed snapshot of the whole marketplace that **every** intelligence engine consumes. One source of truth keeps demand, inventory, pricing, risk, growth, buyer and workflow intelligence consistent and unit-testable.

## Sources (raw → fabric)
`MarketplaceActivityInput` (`types.ts`) carries the real marketplace tables:
| Source | Type | Real table (live path) |
|---|---|---|
| Products | `FabricProductInput` (`SellerProduct` + `sellerId`) | `products` (+ `categories`, `inventory`, `vendors`) |
| Inventory | `InventoryItem` | `inventory` |
| Orders | `SellerOrder` (+ `order_items`) | `orders`, `order_items` |
| Sellers | `StoreActivity` | `vendors` |
| Reviews | `ReviewInput` | `reviews` |
| Returns | `ReturnInput` | (MCP-0D `return_requests`, when present) |
| Refunds | `RefundInput` | `refund_requests` |
| Disputes | `DisputeInput` | `marketplace_disputes` |
| Tickets | `SupportTicketInput` | (MCP-0D `support_tickets`, when present) |
| Promotions | `PromotionActivity` | `seller_promotions` (MCP-0C) |
| Search / Behaviour | `SearchEvent` / `BehaviorEvent` | behavioural events (optional) |

All trust shapes are **reused** from `lib/trust/types.ts`; product/order shapes from `@/features/seller/types`. No new shape duplicates an existing one.

## Derived facts
- **ProductFacts** — velocity/day (units ÷ window), days-of-cover, margin% (cost = 60% of MRP, `ASSUMED_COST_RATIO`), discount%, conversion% (purchases ÷ views), rating, seller-level return-rate proxy.
- **CategoryFacts** — units, revenue, velocity, avg price/rating, OOS count, revenue share.
- **StoreFacts** — orders, cancellations + rate, return/refund rate, disputes, avg rating, response time.
- **MarketplaceTotals** — GMV, AOV, units, active/total products, sellers, verified sellers, categories, OOS, reviews, flagged reviews, open returns/refunds/disputes/tickets.

## Key design points
- **Window** is derived from the earliest order timestamp (clamped 1–90 days); velocities are per-day so forecasts are horizon-independent.
- **Order → seller attribution** is resolved through line-item → product → `sellerId` (orders carry no seller field), enabling true multi-seller marketplace aggregation.
- **Pure & deterministic** — no `Date.now()` inside aggregation when `generatedAt` is supplied; identical input ⇒ identical fabric (asserted in tests).
- **Degrade-safe** — `hasActivity` flags an empty marketplace so surfaces can show honest empty/preview states.

## Consumers
`analyzeDemand`, `analyzeInventory`, `analyzePricing`, `computeMarketplaceHealth`, `detectMarketplaceRisks`, `detectGrowthOpportunities`, `buildBuyerIntelligence`, `runMarketplaceScenario` — all take the fabric (or its outputs), never raw tables.
