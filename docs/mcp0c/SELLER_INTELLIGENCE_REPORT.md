# MCP-0C.10 — Seller Intelligence Activation (the most important section)

Engine: `lib/seller-os/intelligence.ts` (+ reuse of `features/merchant-intelligence`).
UI: Intelligence tab in `/seller/operations`.

## Operates on REAL data — not demo data
`assembleSellerIntelligence` consumes the seller's **live** products, inventory,
pricing and orders (the same `/api/seller/snapshot` data the dashboard uses) and
folds in the **real** merchant-intelligence health score (`externalHealthScore`).
The sample snapshot is used **only** for pre-sign-in preview and is clearly
labelled "Preview (sample data)".

## Delivered recommendation kinds (all from real signals)
| Kind | Derived from |
|------|--------------|
| Demand forecast | blended velocity × 7 days |
| Inventory forecast | turnover days + cover |
| Stockout risk | per-product velocity vs available |
| Price optimization | margin + demand/stock signals |
| Category opportunity | top categories by listing momentum |
| Expansion opportunity | best-seller → variants/bundles |
| Revenue forecast | AOV × order run-rate (30d) |
| Store health | store signals (+ external merchant-intelligence score) |
| Risk alert | SLA risk, cancellation rate |
| Action (headline) | the single highest-priority next step |

## Seller receives (per directive)
Demand/inventory forecasts ✅ · stockout risks ✅ · price optimization ✅ ·
category & expansion opportunities ✅ · revenue forecasts ✅ · store health
scores ✅ · risk alerts ✅ · action recommendations ✅.

## Reuse, not duplication
The existing merchant-intelligence engine (already computing real scores +
forecasts + persisting alerts) provides the health baseline; the Seller OS adds
operating recommendations and presents them as a cockpit.

Verified by tests: recommendation kinds present, external score folded in,
headline action surfaced first, revenue forecast > 0.
