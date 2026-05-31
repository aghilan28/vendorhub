# MCP-1B.6 — Variant Expansion System

**Engine:** `lib/catalog-population/variants.ts` (over MCP-0B variant engine).

## Supported variant dimensions (all mandated)
Size · Weight · Color · Pack size · Volume · Material · Style · Storage — via the
MCP-0B `VariantAxis` set, plus **brand variants** (brand hierarchy) and
**regional variants** (custom axis sets).

## Named variant sets (`VARIANT_SETS`)
`apparel` (size×color) · `footwear` (size×color) · `grocery_pack` (weight×pack) ·
`beverage` (volume×pack) · `electronics` (storage×color) · `material` · `style`.
Plus **custom variant sets** via explicit `axes`.

## Capabilities
- `buildVariantSet` — generates concrete variants (unique SKUs, price deltas,
  stock) via the real `generateVariants` + `validateVariants`; reports
  `count`/`uniqueSkus`/`ok`/`errors`.
- **Variant intelligence** — `recommendVariantAxes(category)` suggests axes from
  the taxonomy `variantAxes`; `variantGap` finds variant-capable products that
  lack variants (population opportunity).

## Exit criteria — met
Complex products are supported: multi-axis variant sets with unique SKUs, plus
intelligence that recommends axes and surfaces variant gaps. Covered by 2 variant
tests.
