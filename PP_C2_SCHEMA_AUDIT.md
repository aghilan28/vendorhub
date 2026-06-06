# PP-C2 — Product Universe Schema & Root-Cause Audit

**Date:** 2026-06-06
**Status:** ✅ Root cause identified and fixed; verified against a real PostgreSQL 17 instance.

---

## 1. The Reported Problem

> "Products table exists. Products count = 0."

This was **true on the live database**, even though the repository already contained a
60,000-row migration (`20260611000000_ppc_product_universe.sql`) and a
`PP_C_FINAL_CERTIFICATION.md` claiming "Product Count: 60,000 — PASS".

## 2. Root Cause (verified)

The prior migration inserted **all 60,000 rows with one vendor**:

```
vendor_id = '30000000-0000-4000-8000-000000000001'
```

- `public.products.vendor_id` is declared `NOT NULL REFERENCES public.vendors(id)`.
- That vendor UUID is created **only in `supabase/seed/phase_1_marketplace_seed.sql`**.
- **Seed files do not run during migration deploys** (`supabase db push` / CI migrate).
  On the hosted project the vendor never existed.
- The entire 60k `INSERT` was wrapped in a **single `BEGIN … COMMIT`**, so the first
  foreign-key violation aborted the whole transaction → **0 rows committed**.

That single dependency is why every downstream feature (search, discovery, ETA,
ranking, inventory) evaluated to zero.

### Secondary findings
- **Coverage gap:** the 60k rows only spanned **3 grocery categories**
  (Atta/Rice/Dal, Oil & Ghee, Masalas & Spices). Required searches such as *Milk,
  Coffee, Samsung, iPhone, Laptop, Dettol, Paracetamol* would have returned **0**
  even after fixing the FK.
- **Placeholder data:** ~thousands of rows were named `"Regional Brand 470 / 1137 …"`,
  violating the "no placeholder products" rule.
- **Missing taxonomy:** there was no Health/OTC, Household/Cleaning, Baby Care, or
  Snacks department/category, so several mandated searches were impossible.

## 3. Schema Touchpoints (verified definitions)

| Table | Key facts relevant to population |
|-------|----------------------------------|
| `products` | `vendor_id` & `category_id` `NOT NULL` + FK; `unique(vendor_id, slug)`; `search_document` is a generated `tsvector`; `status` enum `product_status`. |
| `vendors` | `owner_id NOT NULL REFERENCES profiles(id)`; `slug` unique. |
| `profiles` | `id REFERENCES auth.users(id)` → requires an `auth.users` row. |
| `categories` | legacy phase-1 columns + tier-1 `department_id`, `canonical_name`. |
| `brands` | populated by PP-B (2,000 rows; 257 real-named). |
| `inventory` | `unique(product_id, variant_id)`; `check(reserved ≤ stock)`. |

## 4. The Fix (PP-C2)

New migration **`20260612000000_ppc2_product_universe_repair.sql`** that is
**self-contained, idempotent, and rollback-safe**:

1. **Bootstraps its own vendors** — creates `auth.users` → `public.profiles` →
   `public.vendors` (12 vendors across Indian cities). **No seed-file dependency.**
2. **Adds missing taxonomy** — Health & Wellness, Household & Cleaning, Baby Care,
   Snacks & Branded Foods departments + their categories (OTC Medicine, Cleaning,
   Baby Essentials, Watches, Bags & Luggage, Ice Cream, Cameras, etc.).
3. **Adds ~108 missing real brands** (Dolo, Crocin, Maggi, Pampers, Cadbury, Tide,
   Realme, Vivo, Titan, American Tourister, …) — no filler.
4. **Inserts 53,732 real products** distributed across the 12 vendors, every row with
   `brand_id`, `category_id`, `unit`, `package_size`, `image_url`, and `search_terms`.
5. **Inserts 53,732 inventory rows** (`IN_STOCK`) so products render as available.
6. Defensive `ALTER TABLE … ADD COLUMN IF NOT EXISTS` so it is safe even if the
   PP-C hardening migration has not run.

All `INSERT`s use `ON CONFLICT … DO UPDATE`, so reruns converge (verified: rerun
keeps the count at 53,732 — no duplicates).

A companion `ROLLBACK_ppc2_product_universe_repair.sql` cleanly removes everything
this migration adds (verified: products → 0, vh-vendors → 0).
