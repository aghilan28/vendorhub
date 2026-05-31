# MCP-0C.4 — Inventory Command Center

Engine: `lib/seller-os/inventory.ts` · UI: Inventory tab.

## Capabilities
- **Overview / stock levels** per product (available = stock − reserved).
- **Low-stock & out-of-stock detection** vs a reorder point (max of threshold and
  2× daily velocity).
- **Inventory forecast**: days-of-cover from velocity; 7-day demand target.
- **Reorder suggestions**: `suggestedReorder` units to reach target cover.
- **Turnover**: blended turnover days across the catalog.
- **Bulk updates / history / multi-location**: bulk update via Seller Catalog Ops
  (MCP-0B) + `/api/seller/inventory`; movements via `inventory_movements`.
- **Inventory intelligence**: stockout-risk recommendations (intelligence center).

Signals are sorted riskiest-first (out → low → overstock → healthy).

Verified by tests: out-of-stock + low detection, reorder suggestion, sort order.
