# Deploy Runbook — PP-C2 Product Universe (53,732 products)

This populates your live Supabase (`qvfijkicoldbnynzuanp`) with real products.
The migration is **idempotent** (safe to run more than once) and **rollback-safe**.

---

## Option A — Supabase SQL Editor (simplest, no tooling)

The migration file is ~40 MB / ~53k rows, which is **too large to paste** into the
SQL editor in one go. Use Option B (CLI) or Option C (psql) instead for the product
load. The SQL editor is fine for the verification queries at the bottom.

## Option B — Supabase CLI (recommended)

```bash
# 1. Install the CLI if needed
#    https://supabase.com/docs/guides/cli
# 2. From the repo root:
supabase link --project-ref qvfijkicoldbnynzuanp
# 3. Push migrations (applies any pending migrations, including PP-C2):
supabase db push
```

> If `supabase db push` tries to apply the OLD broken
> `20260611000000_ppc_product_universe.sql` and your DB has never run it, it will fail
> on the missing vendor FK. Two safe choices:
> - Delete that one file before pushing (PP-C2 does not need it), **or**
> - First apply the bundled seed (`supabase/seed/phase_1_marketplace_seed.sql`) so the
>   legacy vendor exists. Either way, **PP-C2 itself is fully self-contained.**

## Option C — Direct `psql` (fastest for the big file)

Get your DB connection string from
**Supabase Dashboard → Project Settings → Database → Connection string (URI)**.

```bash
# Apply just the PP-C2 migration:
psql "postgresql://postgres:[YOUR-PASSWORD]@db.qvfijkicoldbnynzuanp.supabase.co:5432/postgres" \
  -v ON_ERROR_STOP=1 \
  -f supabase/migrations/20260612000000_ppc2_product_universe_repair.sql
```

Expected runtime: a few seconds to ~1 minute.

---

## Verify (run in SQL Editor or psql)

```sql
select count(*) as products from public.products;                 -- 53732
select count(*) from public.products where status='ACTIVE';        -- 53732
select count(*) from public.inventory;                             -- 53732
select count(*) from public.vendors where slug like 'vh-%';        -- 12

-- app-style search smoke test (should all be > 0):
select 'Milk',        count(*) from public.products where search_document @@ websearch_to_tsquery('english','Milk');
select 'iPhone',      count(*) from public.products where search_document @@ websearch_to_tsquery('english','iPhone');
select 'Paracetamol', count(*) from public.products where search_document @@ websearch_to_tsquery('english','Paracetamol');
```

## See it on the site

1. Ensure `.env` has the production Supabase URL + keys (see `.env.example`).
2. `npm install && npm run dev`
3. Open `http://localhost:3000` → homepage shows products; `/search?q=milk` returns results.

No code changes are required — `lib/api/queries/products.ts::listLiveProducts`
reads the `products` table directly, so rows appear as soon as the migration is applied.

---

## Rollback (if ever needed)

```bash
psql "postgresql://...supabase.co:5432/postgres" \
  -f supabase/migrations/ROLLBACK_ppc2_product_universe_repair.sql
```

This removes the PP-C2 products, inventory, and `vh-*` vendors. (Profiles/auth users
are left intact by default; uncomment the last lines of the rollback file to remove them too.)
