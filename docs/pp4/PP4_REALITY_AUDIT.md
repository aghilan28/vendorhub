# PP4_REALITY_AUDIT

**Program:** VendorHub Product Population — Wave 1 (PP-4): Product Universe Population System
**Method:** Source-code audit only. Reports not trusted; foundations, app pages and data layer inspected.
**Audited ref:** branch `pp4-product-universe-population` (cut from `pp3-product-master`, carrying PP-1/2/3).

---

## 0. Headline

PP-1 (taxonomy), PP-2 (brands), PP-3 (product master) are present and complete as `lib/taxonomy`,
`lib/brands`, `lib/products`. The product catalog itself is **empty**: the storefront fallback arrays
(`marketplaceProducts`, `marketplaceCategories`, `marketplaceVendors`, `featuredDeals` in
`features/marketplace/lib/data.ts`) are all `[]`, which is exactly why the homepage shows 0 products.

PP-4 populates the product universe from the foundations (PP-2 brands × PP-1 categories × real product
templates × PP-3 variants) and **activates** the storefront by filling those fallback arrays with a
real catalog. It does **not** modify PP-1/2/3 and creates **no sellers/inventory/hyperlocal**.

---

## 1. Subsystem classification (REAL / PARTIAL / MISSING)

| # | Subsystem | Status | Evidence |
|---|---|---|---|
| 1 | PP-1 taxonomy state | **REAL** | `lib/taxonomy` (26 depts, 536 categories), exports engine/registry |
| 2 | PP-2 brand universe state | **REAL** | `lib/brands` (1327 brands, 70 companies), classified to taxonomy |
| 3 | PP-3 product master state | **REAL** | `lib/products` (master/variant/SKU/inheritance/governance, 1M-scale certified) |
| 4 | Existing product tables | **REAL (schema)** | `products`, `master_products`, `product_masters` (PP-3); no rows populated |
| 5 | Existing product generators | **PARTIAL** | PP-3 `generateSyntheticProducts` (synthetic, not real); no real-catalog generator |
| 6 | Existing seed systems | **MISSING** | no real-product seed/population pipeline |
| 7 | Existing catalog import systems | **PARTIAL** | `lib/catalog-governance` quality scoring exists; no import/population |
| 8 | Search dependencies | **REAL (ready)** | PP-3 `buildProductSearchIndex`; `app/api/intelligence/search` reads `marketplaceProducts` |
| 9 | Recommendation dependencies | **REAL (ready)** | PP-3 `buildProductAffinityGraph`; `recommendation-strip` consumes products |
| 10 | Homepage dependencies | **PARTIAL → empty** | `app/(buyer)/page.tsx` → `listLiveProducts` → **fallback `marketplaceProducts` = []** |
| 11 | Category page dependencies | **PARTIAL → empty** | `app/(buyer)/categories/*` read `marketplaceProducts`/`marketplaceCategories` (empty) |
| 12 | Product page dependencies | **PARTIAL → empty** | `app/(buyer)/product/[slug]` reads `getProductBySlug` over `marketplaceProducts` (empty) |
| — | `lib/product-population/` | **MISSING** | directory does not exist (the deliverable) |

**Summary:** foundations REAL; catalog data MISSING/empty; population system MISSING.

---

## 2. Activation mechanism (verified)

`lib/api/queries/products.ts → listLiveProducts()` returns `listFallbackProducts()` (reading
`marketplaceProducts`) whenever Supabase env vars are absent — the current sandbox/no-DB case. The
entire storefront (home, category, product, search) renders from these fallback arrays. **Populating
them activates the storefront without a database.** This is PP-4's homepage-activation path.

---

## 3. Strategy decision (Phase 1)

- **Generate** real products deterministically by composing PP-2 brands with real, category-appropriate
  product templates and PP-3 variants (e.g. brand "Aavin" + template "Toned Milk" + variant "1L" →
  "Aavin Toned Milk 1L"). This yields genuinely real products (real brand + real category + real
  variant), not lorem ipsum.
- **Seed/populate**: the population engine is the system-of-record universe (10k–100k, certified);
  a deterministic curated **display subset** activates the storefront fallback arrays.
- **Categorize automatically**: products inherit department/category from the template + brand mapping,
  validated against PP-1; **inherit PP-3 structures** (master + variants + SKUs + attribute inheritance).
- **No architectural rewrites**: PP-1/2/3 consumed via imports; only the empty marketplace fallback
  data is populated. No sellers/inventory/hyperlocal.

Proceed to build `lib/product-population/` (population, dataset, quality, coverage, discovery,
certification, seed) + tests + certification + docs, and activate the storefront fallback.
