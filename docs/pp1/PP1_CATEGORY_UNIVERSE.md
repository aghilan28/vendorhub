# PP1_CATEGORY_UNIVERSE

**Phases 2–4 — Category Universe, Product Family Model, Attribute Framework**

The canonical sample taxonomy (`lib/taxonomy/canonical-taxonomy.ts`) is production-grade reference
data — not products, inventory, sellers or stores. It is the single classification source of truth.

## Coverage (measured by `pp1:certify`)

| Level | Count |
|---|---|
| Departments | 26 |
| Categories | 536 |
| Subcategories | 39 |
| Product Families | 2 |
| Product Types | 11 |
| Variant Groups | 4 |
| **Total nodes** | **618** |
| Max depth | 5 (full 6 levels) |
| Integrity | 0 errors, 0 warnings |

> Target was 500+ categories minimum — **536 delivered**.

## Departments (Phase 2)

All directive-required departments are present, plus regional additions:

Groceries · Fresh Produce · Dairy · Bakery · Beverages · Snacks · Frozen Foods · Personal Care ·
Beauty · Health · Baby Care · Pet Care · Household · Cleaning · Kitchen · Electronics · Stationery ·
Pooja · Automotive · Sports · Fashion · Home Essentials · Medicine · Local Specialties ·
Regional Foods · Services.

Each department holds an exhaustive, real category set (Groceries → Rice, Wheat & Atta, Pulses & Dals,
Edible Oils, Spices & Masalas, …; Personal Care → Hair Care, Soap, Oral Care, …; Health → OTC
Medicines, Vitamins, Supplements, First Aid, …). The full set is enumerated in source.

## Product family model (Phase 3)

The 6-level model is exercised end-to-end, e.g.:

```
Dairy > Milk > Liquid Milk > Cow & Buffalo Milk (FAMILY)
      > Full Cream Milk / Toned Milk / Double Toned / Skimmed / A2 / Organic (TYPE)
      > 500 ml Pack / 1 L Pack (VARIANT_GROUP)
Personal Care > Hair Care > Shampoo > Shampoo (FAMILY)
      > Anti-Dandruff / Anti-Hairfall / Herbal / Kids / Color Protect (TYPE)
```

A `PRODUCT_FAMILY` abstracts a product (e.g. "Milk") so future brands attach at the seller/master-
product layer (PP-2+) without changing the taxonomy.

## Attribute framework (Phase 4)

15 reusable, de-duplicated attribute definitions are declared once and referenced by key:

weight, volume, pack_size, material, flavor, color, gender, age_group, organic, vegetarian,
prescription_required, country_of_origin, storage_type, shelf_life, brand_required.

Attributes are declared high in the tree (e.g. `organic`/`storage_type` on Fresh Produce, `gender`
on Fashion, `prescription_required` on Medicine) and inherited downward via `resolveAttributes`,
so there is no per-node duplication.
