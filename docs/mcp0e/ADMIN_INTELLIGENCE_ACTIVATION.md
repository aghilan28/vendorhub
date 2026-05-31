# Admin Intelligence Activation (MCP-0E.8)

**Surface:** `/admin/intelligence` → `app/(admin)/admin/intelligence/page.tsx` → `features/marketplace-intelligence/components/marketplace-intelligence-center.tsx`
**Data:** `lib/marketplace-intelligence/queries.ts` → `getMarketplaceIntelligenceSnapshot()` (admin-gated)

## Live marketplace command center
Admin-gated (`requireRole(["ADMIN","SUPER_ADMIN"])`). When Supabase is configured it reads **real** `products`, `orders`/`order_items`, `vendors`, `reviews`, `refund_requests`, `marketplace_disputes`, builds the fabric, and runs the full engine. Unconfigured → labelled sample (`sampled: true`); never substitutes demo data into a "live" result.

## What admin receives
- **Marketplace health** — composite + demand/inventory/pricing/trust/fulfilment scores.
- **Totals** — GMV, orders, AOV, active/total products, verified sellers, stockouts.
- **Recommendations** — ranked across the marketplace, each tagged with its activation layer (execution / governance / simulation).
- **Demand / Inventory / Pricing** tabs — per-entity intelligence.
- **Risk & Trust** — marketplace, seller, trust, inventory and pricing risks with recommended actions.
- **Growth** — category expansion, demand surges, pricing headroom, discovery gaps.
- **Workflows** — six intelligence workflows and the actions they trigger.

This is the operational realization of "Marketplace Health / Risk / Trust / Growth / Operational / Expansion / Executive" intelligence in one navigable surface.
