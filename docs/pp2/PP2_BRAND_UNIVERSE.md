# PP2_BRAND_UNIVERSE

**Phases 2–4 — Indian Brand Universe, Parent Company System, Classification**

The canonical brand universe (`lib/brands/canonical-brands.ts`) is real-brand reference data — NOT
products, inventory or sellers. Measured by `npm run pp2:certify`.

## Coverage

| Metric | Value |
|---|---|
| Brands | **1327** (target: 1000+) |
| Companies | 70 |
| Brands classified to taxonomy | 1327 / 1327 (100%) |
| Taxonomy departments covered | 24 |
| Invalid taxonomy mappings | 0 |
| Integrity | 0 errors, 0 warnings |

## Sector coverage (Phase 2)

Food, Beverages, Dairy, Personal Care, Beauty, Health, Medicine/Pharma, Household, Cleaning,
Baby Care, Pet Care, Electronics, Appliances, Kitchen, Fashion, Footwear, Sports, Automotive,
Stationery, plus Regional/Hyperlocal/Local and store/generic brands. Real brands only — e.g. Amul,
Aavin, Nandini, Mother Dairy, Britannia, Parle, ITC, Nestle, HUL, P&G, Dabur, Patanjali, Samsung,
LG, boAt, Noise, Haldiram's, Tata, and ~1300 more.

## Parent company system (Phase 3)

70 companies own brand portfolios, with M&A-ready company→company hierarchy. Examples (verified in
the certification report):

```
Hindustan Unilever (42 brands): Dove, Lux, Lifebuoy, Surf Excel, Brooke Bond, Knorr, Kwality Wall's, ...
Nestle India: Maggi, KitKat, Nescafe, Milkmaid, Cerelac, ...
P&G: Ariel, Tide, Gillette, Pampers, Whisper, Vicks, ...
ITC Limited (19 brands): Aashirvaad, Sunfeast, Bingo, Classmate, Savlon, ...
Dabur India (18 brands): Real, Hajmola, Vatika, Odonil, Pudin Hara, ...
Amul: Amul Butter, Amul Cheese, Amul Ice Cream, Amul Taaza, ...
```

Ownership is queryable: `getBrandsByCompany`, `getOwnershipChain`, `getSubsidiaries`,
`getAllBrandsUnderCompany`.

## Classification (Phase 4)

Every brand maps to one or more PP-1 taxonomy departments (and selectively categories). Multi-department
brands are supported — e.g. Amul → Dairy + Frozen Foods + Beverages + Snacks; Surf Excel → Household +
Cleaning; Saffola → Groceries + Health. No unclassified brands exist.

## Search synonyms (Phase 6 sample)

Company abbreviations resolve to their brands: `HUL` ↔ `Hindustan Unilever`, `P&G` ↔
`Procter and Gamble`, `Cadbury` ↔ `Mondelez India` — all surfaced via brand search documents and
`brandsForSearchTerm`.
