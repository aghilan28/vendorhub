# Marketplace Intelligence Realization Report (MCP-0E.14)

## Thesis
MCP-0E turns VendorHub from *Marketplace + Intelligence Platform* into an **Intelligent Marketplace**: marketplace activity drives intelligence, intelligence drives recommendations, recommendations drive execution/governance/simulation.

## The realized loop (all code, all tested)
```
Real activity (products, orders, inventory, reviews, returns, refunds, disputes, behaviour)
        │  lib/marketplace-intelligence/queries.ts (admin-gated / seller / public)
        ▼
Live Marketplace Data Fabric  (fabric.ts)
        ▼
Demand · Inventory · Pricing  (demand.ts · inventory.ts · pricing.ts)
        ▼
Marketplace Health · Risk · Growth · Insights  (marketplace.ts)
        ▼
Unified ranked Recommendations  (recommendations.ts)
        ├── Intelligence Workflows (workflows.ts) → owned actions
        ├── Execution activation   (activation.ts → lib/execution)        → Initiative + Action Plan
        ├── Governance activation  (activation.ts → governance trust-engine) → RiskSignal + enforcement
        └── Simulation activation  (simulation.ts)                          → scenario on live fabric
Surfaces: /admin/intelligence · /seller/intelligence · /discover
```

## What is genuinely live
- **Admin** marketplace intelligence reads real `products/orders/vendors/reviews/refund_requests/marketplace_disputes` when Supabase is configured.
- **Seller** briefing reuses the already-live `getSellerOperationalSnapshot()`.
- **Buyer** discovery reads the public catalog (+ visible reviews).
- The same deterministic engine runs on live and sample data; only the *source* differs. The `sampled` flag is surfaced as a badge so live vs preview is never ambiguous.

## Reuse over duplication
- Product/order/inventory shapes ← `@/features/seller/types`.
- Trust shapes ← `@/lib/trust/types`; governance enforcement ← `features/governance/trust-engine`.
- Execution activation ← `lib/execution` (`activateDecision`), with a new `commerce` source.
- Seller live data ← existing `lib/api/queries/seller.ts`.

## Realization scoring (intelligence integration)
| Capability | Before | After |
|---|---|---|
| Marketplace-wide demand/inventory/pricing | Missing | **Real** |
| Intelligence → execution | Disconnected | **Connected** (commerce source + initiatives) |
| Intelligence → governance | Disconnected | **Connected** (signals + enforcement) |
| Intelligence → simulation | Abstract | **Connected** (scenarios on live fabric) |
| Admin marketplace intelligence center | Missing | **Real surface** |
| Seller actionable briefing | Partial | **Real surface** |
| Buyer smart discovery | Partial | **Real surface** |

## Honest scope
- New MCP-0D tables (`return_requests`, `support_tickets`) and MCP-0C `seller_promotions` are mapped when present; absent tables degrade to empty (no guessed columns), keeping typecheck/build green without a live DB.
- Execution persistence remains client-side (M8 design); MCP-0E provides the activation + lineage.
- Margin uses a documented `cost = 60% of MRP` assumption (no cost column exists).
- Live reads were not executed against a real Supabase here (no DB in sandbox); the engine, mappers, surfaces, tests and build all function and degrade gracefully.
