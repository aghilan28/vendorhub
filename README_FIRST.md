# VendorHub — PP-C2 Product Population Fix (download bundle)

This bundle fixes the root cause of **`products` count = 0** and populates the
database with **53,732 real products**. Everything here is verified against a real
PostgreSQL 17 instance (migration applied with `ON_ERROR_STOP=1`, counts + searches
checked, idempotency + rollback tested).

## What was wrong (1 sentence)
The previous 60k-product migration referenced a vendor (`30000000-…0001`) that only
existed in the **seed file** (which never runs during migrations), so its single
`BEGIN…COMMIT` insert failed the `vendor_id` foreign key and rolled back to **0 rows**.
Full analysis: `PP_C2_SCHEMA_AUDIT.md`.

## What's in this bundle
| File | What it is |
|------|-----------|
| `supabase/migrations/20260612000000_ppc2_product_universe_repair.sql` | **The fix.** Self-contained, idempotent, rollback-safe. Creates its own vendors (auth user→profile→vendor), adds missing taxonomy + ~108 real brands, inserts 53,732 products + inventory. (~40 MB) |
| `supabase/migrations/ROLLBACK_ppc2_product_universe_repair.sql` | Manual rollback. |
| `scripts/generate_product_universe.py` | Deterministic generator (re-run to regenerate the SQL). |
| `scripts/real_brands.json` | Brand reference data used by the generator. |
| `PP_C2_SCHEMA_AUDIT.md` | Root-cause audit. |
| `SEARCH_CERTIFICATION.md` | 40/40 search terms return results (with counts). |
| `PP_C_FINAL_CERTIFICATION.md` | Final certified metrics. |
| `DEPLOY_PP_C2.md` | Step-by-step apply runbook. |
| `top_100_products.txt` | 100 real sample products from the DB. |
| `storefront_preview.html` | Visual storefront preview rendered from real DB rows (open in a browser). |

## How to use (two paths)

### A. Put files into your repo, then deploy
1. Copy `supabase/migrations/20260612000000_ppc2_product_universe_repair.sql`
   (and the ROLLBACK + `scripts/` files) into the matching folders of your repo.
2. Follow `DEPLOY_PP_C2.md`. Quickest route (psql), with your Supabase DB URI:
   ```bash
   psql "postgresql://postgres:[PASSWORD]@db.qvfijkicoldbnynzuanp.supabase.co:5432/postgres" \
     -v ON_ERROR_STOP=1 \
     -f supabase/migrations/20260612000000_ppc2_product_universe_repair.sql
   ```
3. Verify: `select count(*) from public.products;`  → **53732**

### B. Push to GitHub yourself
I can't push to your GitHub (no credentials). From your repo root after copying files in:
```bash
git checkout -b ppc2-product-population
git add supabase/migrations/20260612000000_ppc2_product_universe_repair.sql \
        supabase/migrations/ROLLBACK_ppc2_product_universe_repair.sql \
        scripts/generate_product_universe.py scripts/real_brands.json \
        PP_C2_SCHEMA_AUDIT.md SEARCH_CERTIFICATION.md PP_C_FINAL_CERTIFICATION.md DEPLOY_PP_C2.md
git commit -m "fix(products): populate 53,732 real products (PP-C2); fix vendor FK root cause"
git push origin ppc2-product-population
```
> Note: the SQL is ~40 MB. That's under GitHub's 100 MB hard limit but over the 50 MB
> warning threshold. If you'd rather not commit a large SQL file, commit only
> `scripts/generate_product_universe.py` + `scripts/real_brands.json` and run the
> generator in CI/locally to produce the SQL on demand. (It's fully deterministic.)

## Note on the old broken migration
`20260611000000_ppc_product_universe.sql` is superseded. PP-C2 does **not** depend on it.
If your DB has never run it, you can delete it (it will fail on the missing vendor FK).
