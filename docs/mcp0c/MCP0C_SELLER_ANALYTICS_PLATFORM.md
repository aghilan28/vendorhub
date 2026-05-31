# MCP-0C.9 — Seller Analytics Platform

Engine: `lib/seller-os/analytics.ts` · UI: Analytics tab.

## Metrics (from real snapshot)
- **Revenue** (sum of order subtotals + delivery), **orders**, **AOV**.
- **Conversion proxy**: orders relative to listed stock units.
- **Top products** (by units sold), **top categories** (by listed count).
- **Inventory turnover** (via inventory command), **customer metrics** (via CRM),
  **promotion metrics** (via promotions), **store health** (via store center).
- **Performance trends**: recent revenue trend series.

Analytics are **actionable**: every metric maps to an intelligence recommendation
(e.g. low AOV → bundle suggestion; slow turnover → discount workflow).

Verified by tests: revenue, order count, top-product ordering.
