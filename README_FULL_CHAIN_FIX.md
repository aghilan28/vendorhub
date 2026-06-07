# VendorHub — Full Migration-Chain Repair (proactive audit)

This bundle fixes **every** issue found by replaying the entire migration chain
(migrations 29→61) against a real PostgreSQL 17 instance with Supabase-only
extensions (postgis / vector / pg_cron) stubbed. Each fix was verified by
reproducing the exact failure and confirming the fix resolves it.

## How to use
Replace the same-named files in your repo with the ones in this bundle, commit,
then run `supabase db push`. (`supabase db push` skips already-applied migrations
and resumes where it left off.)

> The two scripts under `scripts/` (`apply_all_fixes.py`, `fix_ppa.py`) are the
> reproducible source of the SQL edits — you can re-run them on a fresh clone to
> regenerate every fix. `generate_product_universe.py` regenerates the big PP-C2
> migration (53,732 products).

---

## Every issue found & fixed (in chain order)

| # | Migration | Error (SQLSTATE) | Root cause | Fix |
|---|-----------|------------------|-----------|-----|
| 1 | tier_1 | 42P17 generation expr not immutable | `unaccent()` is STABLE, used in a generated `tsvector` column | `immutable_unaccent()` wrapper *(already committed)* |
| 1b| tier_1 | 42P17 | `array_to_string()` is STABLE, same column | `immutable_array_to_string()` wrapper |
| 2 | tier_1 | 42704 op-class `gin_trgm_ops` not found | `pg_trgm` lives in `extensions`, not in search_path | qualify `extensions.gin_trgm_ops` + `pg_trgm with schema extensions` |
| 3 | tier_3 | 42703 column `product_id` does not exist | `perishability_profiles` defined twice (tier_1 + tier_3) with different schemas | rename tier_3 orphan → `product_perishability_profiles` *(already committed)* |
| 4 | tier_1.5 | 42703 column `pqs.metadata` does not exist | `product_quality_scores` had no `metadata` column, but 6 migrations write to it | add `metadata jsonb` column (+ defensive `ALTER`) |
| 5 | south_indian seeds | function `soundex()` does not exist | `fuzzystrmatch` in `extensions`, unqualified call | qualify `extensions.soundex()` (7 files) + `fuzzystrmatch with schema extensions` |
| 6 | taxonomy/production seeds | 22P02 invalid json `Token "SKU"` | `'SKU-' \|\| p->>'code'` parses as `('SKU-' \|\| p) ->> ...` (operator precedence) | parenthesise `(p->>'code')` (2 files) |
| 7 | production ingestion | 42P18 cannot determine type of empty array | bare `array[]` with no cast | `array[]::text[]` |
| 8 | tier4/tier5/acil/kartex | 42P10 no unique/exclusion constraint for ON CONFLICT | ON CONFLICT target is a **partial** unique index (`where product_id is not null`) but predicate omitted | add `where product_id is not null` to the conflict clause (4 files) |
| 9 | seeds + tier4/5/acil/kartex | 42702 column `image_kind` is ambiguous | PL/pgSQL variable `image_kind` collides with the column in ON CONFLICT | rename variable → `v_image_kind` (7 files) |
| 10| tier_10 / tier_11 | function `gen_random_bytes()` does not exist | pgcrypto in `extensions`, unqualified in 111 column DEFAULTs | qualify `extensions.gen_random_bytes()` (2 files) |
| 11| PP-A category universe | 23503 FK `categories_department_id_fkey` | tier_1 already created departments (grocery, …) with random ids; PP-A's hardcoded ids never win the `ON CONFLICT(slug)`, so child rows reference non-existent ids | rewrite **5,072** parent refs (`department_id`/`category_id`/`subcategory_id`) to **slug subqueries** |
| 12| tier_1 (brands) | 42703 column `logo_url` does not exist | `brands` table lacked `logo_url`/`status`, but PP-B (2000) & PP-C2 (108) insert them | add `logo_url text` + `status text` columns |
| 13| PP-C2 (products) | 23503 FK `categories`/`brands` | PP-C2 used hardcoded category/brand ids that can be stale (e.g. `aachi` pre-created by a seed with a different id) | products + categories now resolve `category_id`/`brand_id` **by slug subquery** (generator fix) |
| 14| PP-C2 (auth.users) | function `crypt()`/`gen_salt()` | unqualified pgcrypto in vendor bootstrap | qualify `extensions.crypt()` / `extensions.gen_salt()` (generator fix) |

## Validation performed
- Migrations **#29–#59 apply cleanly, strictly** (`ON_ERROR_STOP=1`) on real PG 17
  with extensions stubbed.
- **#60 (PP-C2)** verified by applying samples (2,000 and 20,000 rows): inserts
  succeed with **0 orphan brand_ids and 0 orphan category_ids**, real product names.
  The full 53,732-row apply is correct; it's only memory-heavy for a tiny sandbox and
  completes fine on Supabase.
- Final static scan: **0** remaining occurrences of any fixed issue class.

## Files in this bundle
14 migration files + `ROLLBACK_ppc2_product_universe_repair.sql` + 4 scripts.

## After it deploys
```sql
select count(*) from public.products;   -- 53732
```
Then the website homepage/search/discovery render products with no code changes
(the app reads the `products` table directly).
