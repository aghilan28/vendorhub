# MCP-1B.9 — Seller Catalog Operations

**Engine:** `lib/catalog-population/catalog-ops.ts` · **Surface:** `/seller/catalog-ops`.

## What the seller receives (all mandated)
- **Catalog health** — blended score (catalog quality 60% + media 20% + import 20%).
- **Import health** — publish rate from import analytics.
- **Media health** — media coverage / batch quality.
- **Quality alerts** — low quality, low attribute completeness.
- **Variant alerts** — surfaced via catalog recommendations / variant gaps.
- **Catalog recommendations** — ranked fixes from the quality platform.
- **Catalog intelligence** — quality bands + duplicate risk + coverage.
- **Action center** — severity-ranked `CatalogAlert[]`, each deep-linking to the
  resolving workspace (import / media / products / catalog).
- **Daily catalog briefing** — human-readable status lines.

## Integration
Built on Seller OS catalog data (products), the Trust layer (storefront trust
quality), and Commerce Intelligence (recommendation pattern shared with MCP-0E/1A).

## Exit criteria — met
The seller knows the state of their catalog and exactly how to improve it.
Covered by 2 catalog-ops tests (gaps + empty catalog).
