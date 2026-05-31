# PP4_POPULATION_STRATEGY

**Phase 1 — Product Population Strategy**

| Question | Answer | How |
|---|---|---|
| Can products be imported? | Yes (future) | PP-3 `ProductMasterInput` is the import contract; importers map external feeds to it |
| Can products be generated? | **Yes (this wave)** | `lib/product-population` composes PP-2 brands × real templates × PP-3 variants |
| Can products be seeded? | Yes | `buildStorefrontCatalog` projects a display subset into the storefront fallback |
| Can products be synchronized? | Yes (future) | deterministic IDs/slugs make re-generation idempotent and diffable |
| Can products be categorized automatically? | **Yes** | templates carry a department; brand→department mapping + PP-1 validation classify every product |
| Can products inherit PP-3 structures? | **Yes** | products are PP-3 `ProductMaster` with PP-3 variants, SKUs and attribute inheritance |

## Chosen strategy: deterministic real composition

A **template** is a category-appropriate product type with realistic variants + attributes
(e.g. "Toned Milk" → 500ml/1L/2L). Composing a real PP-2 brand with a department-matched template
yields a real product: `composeName(brand, template)` de-duplicates shared words so product-line
brands read cleanly — "Amul Butter" + "Butter" → **Amul Butter**, "Dove" + "Shampoo" → **Dove Shampoo**,
"Maggi" + "Masala Noodles" → **Maggi Masala Noodles**.

- **Base real catalog** (no edition qualifier): ~7,650 products spanning all 20 target departments.
- **Populated universe** (preferred target): 50,000 products via deterministic real pack editions
  (Family Pack, Value Pack, …) — every product remains a valid PP-3 product with a real brand, real
  taxonomy department and real variants.
- **Storefront activation**: a 600-product display subset is projected into the storefront fallback
  arrays so the homepage/category/product/search pages render real products without a database.

No architectural rewrites: PP-1/PP-2/PP-3 are consumed via imports and left unmodified. No sellers,
inventory, or hyperlocal are created (the display vendor is a single neutral catalog placeholder and
stock is a display placeholder, not an inventory ledger).
