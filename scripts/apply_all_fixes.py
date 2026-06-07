#!/usr/bin/env python3
"""
VendorHub migration-chain repair — applies ALL discovered fixes idempotently.
Run from repo root:  python3 apply_all_fixes.py
Safe to run multiple times.
"""
import re, os, sys

MIG = "supabase/migrations"

def read(f):  return open(os.path.join(MIG, f), encoding="utf-8").read()
def write(f, s): open(os.path.join(MIG, f), "w", encoding="utf-8").write(s)
def report(tag, n): print(f"  [{tag}] {n}")

# ---------------------------------------------------------------------------
# FIX 1 (tier_1): immutability — already committed, but make idempotent anyway
# ---------------------------------------------------------------------------
def fix_tier1_immutable():
    f = "20260529020000_tier_1_commerce_foundation.sql"; s = read(f); orig = s
    if "immutable_unaccent" not in s:
        s = s.replace(
            'create extension if not exists "pg_trgm";',
            'create extension if not exists "pg_trgm" with schema extensions;', 1)
        # (full wrapper injection omitted — already committed in repo)
    # trgm op-class qualification
    s = s.replace("using gin(normalized_name gin_trgm_ops)", "using gin(normalized_name extensions.gin_trgm_ops)")
    s = s.replace("using gin(normalized_alias gin_trgm_ops)", "using gin(normalized_alias extensions.gin_trgm_ops)")
    s = s.replace("using gin(normalized_token gin_trgm_ops)", "using gin(normalized_token extensions.gin_trgm_ops)")
    if s != orig: write(f, s); report("FIX1 tier_1 trgm/immutable", "patched")
    else: report("FIX1 tier_1", "already ok")

# ---------------------------------------------------------------------------
# FIX 2 (tier_1.5): product_quality_scores needs a metadata column
# ---------------------------------------------------------------------------
def fix_pqs_metadata():
    f = "20260529030000_tier_1_5_catalog_governance.sql"; s = read(f); orig = s
    if "add column if not exists metadata jsonb" not in s and "product_quality_scores" in s:
        s = s.replace(
            "  findings jsonb not null default '[]'::jsonb,\n  scan_job_id uuid,",
            "  findings jsonb not null default '[]'::jsonb,\n  metadata jsonb not null default '{}'::jsonb,\n  scan_job_id uuid,", 1)
        # defensive ALTER right after the create table ... );  for product_quality_scores
        marker = "unique (product_id, scored_at)\n);"
        if marker in s and "alter table public.product_quality_scores\n  add column if not exists metadata" not in s:
            s = s.replace(marker,
                marker + "\nalter table public.product_quality_scores\n  add column if not exists metadata jsonb not null default '{}'::jsonb;", 1)
    if s != orig: write(f, s); report("FIX2 pqs metadata", "patched")
    else: report("FIX2 pqs metadata", "already ok")

# ---------------------------------------------------------------------------
# FIX 3 (tier_3): perishability_profiles collision -> rename orphan
#   (already committed; idempotent re-apply)
# ---------------------------------------------------------------------------
def fix_tier3_perish():
    f = "20260529050000_tier_3_hyperlocal_operations.sql"; s = read(f); orig = s
    if "product_perishability_profiles" not in s:
        s = s.replace("create table if not exists public.perishability_profiles (",
                      "create table if not exists public.product_perishability_profiles (", 1)
        s = s.replace("on public.perishability_profiles(product_id)",
                      "on public.product_perishability_profiles(product_id)")
        s = s.replace("perishability_profiles_product_idx",
                      "product_perishability_profiles_product_idx")
        s = s.replace("alter table public.perishability_profiles enable row level security;",
                      "alter table public.product_perishability_profiles enable row level security;")
        s = s.replace("    'perishability_profiles',", "    'product_perishability_profiles',")
    if s != orig: write(f, s); report("FIX3 tier_3 perish rename", "patched")
    else: report("FIX3 tier_3 perish rename", "already ok")

# ---------------------------------------------------------------------------
# FIX 4: soundex() -> extensions.soundex()  + fuzzystrmatch schema
# ---------------------------------------------------------------------------
def fix_soundex():
    n = 0
    for f in os.listdir(MIG):
        if not f.endswith(".sql"): continue
        s = read(f); orig = s
        s = s.replace('create extension if not exists "fuzzystrmatch";',
                      'create extension if not exists "fuzzystrmatch" with schema extensions;')
        s = re.sub(r'(?<![.\w])soundex\(', 'extensions.soundex(', s)
        s = s.replace("extensions.extensions.soundex(", "extensions.soundex(")
        if s != orig: write(f, s); n += 1
    report("FIX4 soundex qualified (files)", n)

# ---------------------------------------------------------------------------
# FIX 5: gen_random_bytes() -> extensions.gen_random_bytes()
# ---------------------------------------------------------------------------
def fix_gen_random_bytes():
    n = 0
    for f in os.listdir(MIG):
        if not f.endswith(".sql"): continue
        s = read(f); orig = s
        s = re.sub(r'(?<![.\w])gen_random_bytes\s*\(', 'extensions.gen_random_bytes(', s)
        s = s.replace("extensions.extensions.gen_random_bytes(", "extensions.gen_random_bytes(")
        if s != orig: write(f, s); n += 1
    report("FIX5 gen_random_bytes qualified (files)", n)

# ---------------------------------------------------------------------------
# FIX 6: ppc2 crypt()/gen_salt() -> extensions.*  (in case regenerated/committed raw)
# ---------------------------------------------------------------------------
def fix_ppc2_pgcrypto():
    f = "20260612000000_ppc2_product_universe_repair.sql"
    if not os.path.exists(os.path.join(MIG, f)): report("FIX6 ppc2 pgcrypto", "file absent (skip)"); return
    s = read(f); orig = s
    s = re.sub(r"(?<![.\w])crypt\('VendorHub", "extensions.crypt('VendorHub", s)
    s = re.sub(r"(?<![.\w])gen_salt\('bf'\)", "extensions.gen_salt('bf')", s)
    s = s.replace("extensions.extensions.", "extensions.")
    if s != orig: write(f, s); report("FIX6 ppc2 pgcrypto", "patched")
    else: report("FIX6 ppc2 pgcrypto", "already ok")

# ---------------------------------------------------------------------------
# FIX 7: text-literal || jsonb->>'k' precedence  ('SKU-' || p->>'code' ...)
# ---------------------------------------------------------------------------
def fix_concat_precedence():
    n = 0
    pat = re.compile(r"('(?:[^']*)'\s*\|\|\s*)([a-z_][a-z0-9_]*)\s*->>\s*('[^']*')")
    for f in os.listdir(MIG):
        if not f.endswith(".sql"): continue
        s = read(f); orig = s
        s = pat.sub(lambda m: f"{m.group(1)}({m.group(2)}->>{m.group(3)})", s)
        if s != orig: write(f, s); n += 1
    report("FIX7 concat precedence (files)", n)

# ---------------------------------------------------------------------------
# FIX 8: bare array[] -> array[]::text[]
# ---------------------------------------------------------------------------
def fix_bare_array():
    n = 0
    for f in os.listdir(MIG):
        if not f.endswith(".sql"): continue
        s = read(f); orig = s
        s = re.sub(r'array\[\](?!\s*::)', 'array[]::text[]', s)
        if s != orig: write(f, s); n += 1
    report("FIX8 bare array[] cast (files)", n)

# ---------------------------------------------------------------------------
# FIX 9: ON CONFLICT against partial search_tokens index needs WHERE predicate
# ---------------------------------------------------------------------------
def fix_onconflict_predicate():
    n = 0
    for f in os.listdir(MIG):
        if not f.endswith(".sql"): continue
        s = read(f); orig = s
        s = s.replace(
            "on conflict (product_id, normalized_token, token_type, language) do update",
            "on conflict (product_id, normalized_token, token_type, language) where product_id is not null do update")
        # guard against double-predicate
        s = s.replace("where product_id is not null where product_id is not null", "where product_id is not null")
        if s != orig: write(f, s); n += 1
    report("FIX9 on-conflict predicate (files)", n)

# ---------------------------------------------------------------------------
# FIX 10: image_kind PL/pgSQL variable collides with column in ON CONFLICT
# ---------------------------------------------------------------------------
def fix_image_kind():
    n = 0
    for f in os.listdir(MIG):
        if not f.endswith(".sql"): continue
        s = read(f); orig = s
        if "foreach image_kind in array" not in s and "image_kind text;" not in s:
            continue
        s = re.sub(r'\bimage_kind text;', 'v_image_kind text;', s)
        s = re.sub(r'\bforeach image_kind\b', 'foreach v_image_kind', s)
        s = re.sub(r'\bimage_kind::', 'v_image_kind::', s)
        s = re.sub(r'lower\(image_kind\)', 'lower(v_image_kind)', s)
        s = re.sub(r'replace\(image_kind', 'replace(v_image_kind', s)
        # any comparison/use of the variable: image_kind <op> '...'  (=, <>, !=, in, not in, like)
        s = re.sub(r"\bimage_kind\s*(=|<>|!=|<|>)\s*'", lambda m: "v_image_kind " + m.group(1) + " '", s)
        s = re.sub(r"\bimage_kind\s+(not\s+in|in)\s*\(", lambda m: "v_image_kind " + m.group(1) + " (", s)
        # NOTE: leave 'image_kind' as-is when it's a column in INSERT column lists,
        # the unique index, and ON CONFLICT (those are bare ', image_kind,' / '(... image_kind ...)').
        if s != orig: write(f, s); n += 1
    report("FIX10 image_kind var rename (files)", n)

# ---------------------------------------------------------------------------
# FIX 12 (tier_1): brands table missing logo_url / status columns used by PP-B & PP-C2
# ---------------------------------------------------------------------------
def fix_brands_columns():
    f = "20260529020000_tier_1_commerce_foundation.sql"; s = read(f); orig = s
    if "create table if not exists public.brands" in s and "add column if not exists logo_url" not in s:
        # add columns inside the create table (before metadata) AND a defensive ALTER after
        s = s.replace(
            "  is_local_brand boolean not null default false,\n  metadata jsonb not null default '{}'::jsonb\n);",
            "  is_local_brand boolean not null default false,\n  logo_url text,\n  status text not null default 'ACTIVE',\n  metadata jsonb not null default '{}'::jsonb\n);\n"
            "alter table public.brands\n  add column if not exists logo_url text,\n  add column if not exists status text not null default 'ACTIVE';", 1)
    if s != orig: write(f, s); report("FIX12 brands logo_url/status", "patched")
    else: report("FIX12 brands logo_url/status", "already ok")


if __name__ == "__main__":
    if not os.path.isdir(MIG):
        print("ERROR: run from repo root (need supabase/migrations/)"); sys.exit(1)
    print("Applying all VendorHub migration fixes...")
    fix_brands_columns()
    fix_tier1_immutable()
    fix_pqs_metadata()
    fix_tier3_perish()
    fix_soundex()
    fix_gen_random_bytes()
    fix_ppc2_pgcrypto()
    fix_concat_precedence()
    fix_bare_array()
    fix_onconflict_predicate()
    fix_image_kind()
    print("Done.")
