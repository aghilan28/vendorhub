#!/usr/bin/env python3
"""FIX11: Make PP-A category-universe robust to pre-existing departments/categories.

Root cause: tier_1 already created departments (grocery, dairy-breakfast, ...) with
random gen_random_uuid() ids. PP-A re-inserts them with hardcoded ids using
ON CONFLICT (slug) DO UPDATE, which keeps the EXISTING id. PP-A's child rows then
reference the hardcoded ids -> FK violation.

Fix: rewrite every PARENT reference (department_id / category_id / subcategory_id) in
categories, subcategories and product_families to resolve the real id by slug subquery.
The rows' own ids are left as-is (harmless; conflicts resolve on slug).
"""
import re, sys, os

F = "supabase/migrations/20260606010000_ppa_category_universe.sql"

def main():
    s = open(F, encoding="utf-8").read()
    dep = {m[0]: m[1] for m in re.findall(
        r"INSERT INTO public\.departments \(id, slug[^)]*\) VALUES \('([0-9a-f-]{36})', '([a-z0-9-]+)'", s)}
    cat = {m[0]: m[1] for m in re.findall(
        r"INSERT INTO public\.categories \(id, department_id, name, slug[^)]*\) VALUES \('([0-9a-f-]{36})', '[0-9a-f-]{36}', '[^']*', '([a-z0-9-]+)'", s)}
    sub = {m[0]: m[1] for m in re.findall(
        r"INSERT INTO public\.subcategories \(id, department_id, category_id, slug[^)]*\) VALUES \('([0-9a-f-]{36})', '[0-9a-f-]{36}', '[0-9a-f-]{36}', '([a-z0-9-]+)'", s)}

    def D(i): return f"(select id from public.departments where slug = '{dep[i]}')"
    def C(i): return f"(select id from public.categories where slug = '{cat[i]}')"
    def S(i): return f"(select id from public.subcategories where slug = '{sub[i]}')"

    out = []
    changed = 0
    for ln in s.split("\n"):
        orig = ln
        # categories: (id, department_id, ...)
        m = re.match(r"^(INSERT INTO public\.categories \(id, department_id, name, slug, canonical_name\) VALUES \('[0-9a-f-]{36}', )'([0-9a-f-]{36})'(, .*)$", ln)
        if m and m.group(2) in dep:
            ln = m.group(1) + D(m.group(2)) + m.group(3)
        else:
            # subcategories: (id, department_id, category_id, ...)
            m = re.match(r"^(INSERT INTO public\.subcategories \(id, department_id, category_id, slug, canonical_name\) VALUES \('[0-9a-f-]{36}', )'([0-9a-f-]{36})', '([0-9a-f-]{36})'(, .*)$", ln)
            if m and m.group(2) in dep and m.group(3) in cat:
                ln = m.group(1) + D(m.group(2)) + ", " + C(m.group(3)) + m.group(4)
            else:
                # product_families: (id, department_id, category_id, subcategory_id, ...)
                m = re.match(r"^(INSERT INTO public\.product_families \(id, department_id, category_id, subcategory_id, slug, canonical_name\) VALUES \('[0-9a-f-]{36}', )'([0-9a-f-]{36})', '([0-9a-f-]{36})', '([0-9a-f-]{36})'(, .*)$", ln)
                if m and m.group(2) in dep and m.group(3) in cat and m.group(4) in sub:
                    ln = m.group(1) + D(m.group(2)) + ", " + C(m.group(3)) + ", " + S(m.group(4)) + m.group(5)
        if ln != orig:
            changed += 1
        out.append(ln)

    open(F, "w", encoding="utf-8").write("\n".join(out))
    print(f"FIX11 PP-A: rewrote {changed} parent references to slug subqueries "
          f"(dep={len(dep)}, cat={len(cat)}, sub={len(sub)})")

if __name__ == "__main__":
    if not os.path.exists(F):
        print("PP-A file not found"); sys.exit(1)
    main()
