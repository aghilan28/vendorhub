# VendorHub Phase 27 Merchant Intelligence

Status: implemented seller operating intelligence for demand forecasting, inventory guidance, fulfillment optimization, discoverability, hyperlocal market signals, pricing decision support, cold-start guidance, fairness safeguards, and observability.

## Audit Findings

- Seller dashboard mixed live snapshot data with static product/order samples.
- Analytics page still used placeholder metrics and did not explain what sellers should do next.
- Seller intelligence was distributed across isolated UI areas rather than a central operating engine.
- No persisted schema existed for intelligence snapshots, seller alerts, or forecast observability.

## Implemented

- Central merchant intelligence engine in `features/merchant-intelligence`.
- Explainable demand forecasts based on recent order lines, seller movement signals, and available stock.
- Inventory intelligence for restock risk, dead-stock prevention, turnover, and reorder guidance.
- Fulfillment health with delayed order, cancellation, promise-window, and bottleneck signals.
- Product discoverability visibility with search/content/stock reasons.
- Pricing guidance with explicit no-auto-price-change guardrails.
- Hyperlocal signals using seller locality, service radius, category movement, and cold-start opportunities.
- Multilingual insight snippets for Tamil and Hindi seller guidance.
- Seller dashboard and analytics page now use live merchant intelligence.
- Tenant-isolated DB tables for snapshots, alerts, and forecast observability.
- Load script for `/api/seller/intelligence` p95 checks.

## Guardrails

- Forecasts are explainable and confidence-scored.
- Alerts are capped and high-signal.
- Cold-start sellers receive fair guidance without needing incumbent order volume.
- Seller intelligence remains tenant-isolated through vendor-member RLS.
- Pricing is decision support only.
