# EC-3 Phase 4 — Attribute & Variant Certification

**Source:** `lib/catalog/variants.ts`, `lib/catalog/attributes.ts`, `lib/catalog-population/variants.ts`, `product_variants` table.

| Aspect | Status | Evidence |
|--------|--------|----------|
| Attributes | ✅ REAL | `lib/catalog/attributes.ts` per-family templates (Mobiles RAM/Storage; Fashion Size/Color/Material; Groceries Weight/Expiry), required/enum validation |
| Specifications | ✅ REAL | `fillAttributes` populates per-node attribute families; stored on product |
| Variant groups | ✅ REAL | `node.variantAxes` define axes per category |
| Variant combinations | ✅ REAL | `generateVariants` capped cartesian product, unique SKUs per combination |
| Variant pricing | ✅ REAL | `basePrice` + per-variant price deltas |
| Variant inventory | ✅ REAL | per-variant stock; `product_variants` table |
| Variant media | ✅ REAL | image inheritance + media pipeline supports per-variant assets |
| Variant governance | ✅ REAL | `lib/catalog-population/variants.ts` `recommendVariantAxes`, `variantGap`; quality scoring |

**Scale evidence:** `validateUniverseScale(10000)` reports total variants across the 10k sample (executed via capacity test); all SKUs unique.

**Status: PASS.**
