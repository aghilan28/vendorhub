# MCP-0B.4 — Variant Engine

Source: `lib/catalog/variants.ts`. Persists to `public.product_variants`
(`sku` unique, `attributes` jsonb, `price_delta`).

## Axes supported
color, size, pack_size, weight, volume, configuration, material, style, storage —
each with a default option pool (`VARIANT_OPTIONS`).

## Generation
- `planVariantCombinations(axes, cap=24)` → capped cartesian product of axis
  options (prevents SKU explosion).
- `generateVariants({ baseSku, baseName, axes, basePrice })` → concrete variants
  with deterministic SKU (`BASE-<combo>`), label, `priceDelta`, and stock.

## Relationships / inventory / pricing / media
- **Relationships**: variants reference a parent product (`product_id` FK).
- **Inventory**: per-variant rows supported (`inventory.variant_id`).
- **Pricing**: `price_delta` over the product base price.
- **Media**: variant attributes (e.g. color) map to gallery items (MCP-0A).

## Validation
`validateVariants(variants)` → unique SKUs + non-negative price deltas.

Verified by tests: capped cartesian, unique SKU generation, axis-less → none.
