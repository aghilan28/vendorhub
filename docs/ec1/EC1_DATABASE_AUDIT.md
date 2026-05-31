# EC1 Database Consolidation Audit

**Branch:** `release/v1-candidate`
**Date:** 2026-05-31

---

## Migration Inventory

| Metric | Value |
|--------|-------|
| Total migration files | **49** |
| Distinct timestamp prefixes | **49** (no collisions) |
| Duplicate migrations | **0** (`uniq -d` on prefixes = empty) |
| RLS enable statements | 170 |
| CREATE POLICY statements | 254 |
| Security-definer helper fns | present (`current_user_has_role`, `current_user_is_vendor_member`) |

---

## MCP-Added Migrations (consolidated)

| Migration | Phase | Purpose |
|-----------|-------|---------|
| `…mcp0a_media_platform.sql` | MCP-0A | 10 storage buckets + RLS, media tables |
| `…mcp0b_catalog_seed.sql` | MCP-0B | 97 categories + 1,200 ACTIVE products |
| `…mcp0c_seller_promotions.sql` | MCP-0C | `seller_promotions` + redemptions + RLS |
| `…mcp0d_trust_layer.sql` | MCP-0D | `product_questions`, `return_requests`, `support_tickets` + RLS |

Base (pre-MCP): 44 migrations covering core commerce, payments, logistics, trust/KYC, async, performance, tier research ingestions.

---

## Migration Order Integrity

| Check | Result |
|-------|--------|
| Sequential timestamp ordering | ✅ Monotonic; MCP migrations carry later timestamps than base |
| Duplicate timestamps | ✅ None |
| Conflicting table definitions | ✅ None — MCP migrations create NEW tables, do not redefine base tables |
| Missing dependencies | ✅ Role helpers (`init_role_helpers`) precede all policy references |
| Broken order | ✅ None — linear-trunk merge preserved original timestamp order |

---

## Tables / Functions / RPCs

- **280+ tables** across all migrations (core commerce, payments, logistics, trust, async, observability, India-specific, MCP additions).
- **RPCs** consumed by app code: `upsert_live_cart_item`, `remove_live_cart_item`, `atomic_checkout`, `search_products_hybrid`, and others — all defined in migrations, called from `lib/actions/*` and `lib/api/queries/*`.
- **Triggers/Indexes:** `phase_26_performance_scalability` adds 328 indexes (per base audit); pgvector indexes for AI search.

---

## Consolidation Findings

| Concern | Finding |
|---------|---------|
| Duplicate migrations | None — the linear-trunk merge means each phase appended its migration once |
| Conflicting migrations | None — MCP phases only ADD tables (media, promotions, Q&A, returns, support_tickets) |
| Migration replay risk | Low — all are idempotent-styled; not executed in sandbox (no live DB) |
| Seed not applied | `mcp0b_catalog_seed` (1,200 products) is committed but NOT executed (no live DB in sandbox) |

---

## Database Verdict

✅ **One clean lineage.** 49 migrations, zero duplicates, zero conflicts, monotonic order, RLS-heavy (254 policies). MCP migrations are purely additive. No new tables were created during EC-1 merge resolution (the directive's escape hatch was not needed). The only operational caveat: migrations + seed require execution against a live Supabase (deployment task, not a consolidation defect).
