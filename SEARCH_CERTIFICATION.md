# Search Activation Certification (PP-C2)

**Date:** 2026-06-06
**Method:** Counts produced by running the *exact* query the app uses
(`websearch_to_tsquery('english', term)` against `products.search_document`,
filtered to `status='ACTIVE' AND deleted_at IS NULL`) on a real PostgreSQL 17
instance loaded with the PP-C2 migration (53,732 products).

**Result: 40 / 40 mandated and extended search terms return results.** ✅

| Query | Status | Result Count |
|-------|--------|--------------|
| Milk          | PASS | 1380 |
| Aavin         | PASS | 146 |
| Amul          | PASS | 162 |
| Butter        | PASS | 197 |
| Coffee        | PASS | 48 |
| Bru           | PASS | 18 |
| Horlicks      | PASS | 13 |
| Boost         | PASS | 13 |
| Complan       | PASS | 13 |
| Dettol        | PASS | 61 |
| Lifebuoy      | PASS | 55 |
| Dove          | PASS | 97 |
| Lux           | PASS | 55 |
| Samsung       | PASS | 26 |
| iPhone        | PASS | 42 |
| HP            | PASS | 24 |
| Dell          | PASS | 20 |
| Lenovo        | PASS | 20 |
| Paracetamol   | PASS | 12 |
| Laptop        | PASS | 119 |
| Rice          | PASS | 2465 |
| Sugar         | PASS | 498 |
| Oil           | PASS | 1600 |
| Ghee          | PASS | 1408 |
| Tea           | PASS | 114 |
| Shampoo       | PASS | 220 |
| Toothpaste    | PASS | 90 |
| Soap          | PASS | 368 |
| Noodles       | PASS | 34 |
| Maggi         | PASS | 30 |
| Chocolate     | PASS | 247 |
| Biscuit       | PASS | 161 |
| Diaper        | PASS | 36 |
| Detergent     | PASS | 90 |
| Shoes         | PASS | 960 |
| Jeans         | PASS | 6552 |
| Shirt         | PASS | 13500 |
| Watch         | PASS | 64 |
| Earbuds       | PASS | 15 |
| Refrigerator  | PASS | 42 |

> Counts are conservative full-text-only matches; production results will be equal
> or higher once category/brand facet joins are applied.
