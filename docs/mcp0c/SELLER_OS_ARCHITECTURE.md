# MCP-0C.2 — Seller OS Architecture

## Principle
A single deterministic engine (`lib/seller-os/`) consumes the seller's **live
operating snapshot** (the same `products / inventory / orders` shapes the real
`/api/seller/snapshot` returns) and produces every operating center. Because the
engine consumes the real snapshot, it operates on **live data, not demo data**.

## Layers
```
/api/seller/snapshot (REAL: products, inventory, orders, merchant-intelligence)
        │  useSellerDashboard()
        ▼
lib/seller-os/  (pure, client-safe engine)
  store · inventory · pricing · orders · promotions · customers · analytics
  workflow · intelligence · buildSellerOs()
        │
        ▼
features/seller-os/components/seller-os-workspace.tsx  →  /seller/operations
        │ (8 tabbed centers)
        ▼
Seller runs the business
```

## Core domains (engine modules)
| Domain | Module | Output |
|--------|--------|--------|
| Store | `store.ts` | health, completeness, verification signals |
| Catalog | (MCP-0B) | products feed the snapshot |
| Inventory | `inventory.ts` | stockout risk, days-of-cover, reorder, turnover |
| Pricing | `pricing.ts` | margin, optimization, validation |
| Orders | `orders.ts` | state machine, next actions, fulfillment/SLA |
| Customers | `customers.ts` | segments + value from orders |
| Promotions | `promotions.ts` | validate/apply/projectConversion |
| Analytics | `analytics.ts` | revenue/orders/AOV/top/trends |
| Intelligence | `intelligence.ts` | 10 recommendation kinds on real data |
| Workflows | `workflow.ts` | 7 workflows + trigger detection |
| Governance/Approvals | workflow + order/price validation | gates |
| Notifications/Tasks | recommendations + workflows + SLA | surfaced |

## Why reuse, not rebuild
The existing `features/merchant-intelligence` already computes real scores on real
data; the Seller OS folds its `healthScore` in (`externalHealthScore`) and adds
the operating layers (pricing/promotions/customers/workflows) it lacked. No
parallel intelligence silo.

## Graceful degradation
With a signed-in seller → live data. Without → a clearly-labelled SAMPLE snapshot
so the cockpit is fully explorable; the engine logic is identical either way.
