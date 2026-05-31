# Seller Intelligence Activation (MCP-0E.6)

**Surface:** `/seller/intelligence` → `app/(seller)/seller/intelligence/page.tsx` → `features/marketplace-intelligence/components/seller-intelligence-briefing.tsx`
**Data:** `lib/marketplace-intelligence/queries.ts` → `getSellerIntelligenceBriefing()`

## Live, not static
The briefing is built from the seller's **real** operating snapshot — `getSellerOperationalSnapshot()` (already live in `lib/api/queries/seller.ts`, reading `products`/`inventory`/`orders`). Its products/inventory/orders are mapped into a single-store `MarketplaceActivityInput`, then run through `buildMarketplaceIntelligence`. When Supabase is unconfigured (or no vendor), it renders a clearly-labelled sample (`sampled: true`).

## What every seller receives
- **Store health** score (demand/inventory/pricing/trust/fulfilment).
- **Demand forecast** (7-day per product) and 30-day store run-rate.
- **Inventory alerts** (stockout / watch / overstock / dead stock + reorder qty).
- **Price guidance** (raise / promote / discount with rationale).
- **Today's top actions** — ranked recommendations across all domains.
- **Growth opportunities** and **active workflows** triggered by live data.

Every item is an **action**, not a chart — matching the directive ("Actionable intelligence only").

## Reuse
Builds on the MCP-0C merchant-intelligence engine and the live seller snapshot rather than duplicating them; the new value is the unified, ranked, activatable briefing.
