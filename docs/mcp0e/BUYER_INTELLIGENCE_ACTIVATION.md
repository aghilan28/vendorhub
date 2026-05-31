# Buyer Intelligence Activation (MCP-0E.7)

**Surface:** `/discover` → `app/(buyer)/discover/page.tsx` → `features/marketplace-intelligence/components/buyer-smart-discovery.tsx`
**Engine:** `lib/marketplace-intelligence/buyer.ts` → `buildBuyerIntelligence(fabric, ctx)`
**Data:** `lib/marketplace-intelligence/queries.ts` → `getBuyerDiscoveryIntelligence(ctx)` (public catalog; sample fallback)

## What buyers receive
- **Trending now** — ranked by live velocity + recent views.
- **Recommended for you** — ratings × conversion × demand.
- **Related by category** — top items per category (optionally scoped to the browsed category).
- **Availability predictions** — "selling fast — ~Nd left", "currently unavailable — restock expected", or "in stock".
- **Delivery predictions** — per-seller ETA (from response time) with a confidence that reflects verification.
- **Smart discovery** — trending category, top-rated nearby, in-demand nudges.

## Operates on real behaviour
The buyer fabric is assembled from the **public** `products` catalog (+ visible `reviews`) under anon RLS; behavioural views/purchases feed conversion when present. No login required. When Supabase is unconfigured or the catalog is empty, a labelled sample drives the preview (`sampled: true`).

## Reuse
Complements the existing real recommendation/search stack (`features/intelligence/*`, `lib/ai/*`); MCP-0E adds the fabric-driven discovery surface and availability/delivery prediction layer.
