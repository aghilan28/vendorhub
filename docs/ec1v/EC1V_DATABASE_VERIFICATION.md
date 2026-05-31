# EC1V Phase 8 — Database Verification

**Method:** Independent grep/count over `supabase/migrations/`. Compared against EC-1 claims.

---

## Independent Counts

| Item | Verified | EC-1 Claim | Verdict |
|------|----------|-----------|---------|
| Migration files | **49** | 49 | ✅ EXACT |
| Duplicate timestamp prefixes | **0** | 0 | ✅ EXACT |
| RLS `enable row level security` | **182** | 170 | ✅ TRUE (EC-1 understated; more RLS than claimed) |
| `CREATE POLICY` | **273** | 254 | ✅ TRUE (understated) |
| Functions (`create [or replace] function`) | **132** | "present" | ✅ TRUE |
| Triggers (`create trigger`) | **33** | — | ✅ Present |
| Indexes (`create index`/unique) | **392** | "328 (base)" | ✅ TRUE (more after MCP) |

---

## MCP Migrations Confirmed Present

```
20260531000000_mcp0a_media_platform.sql
20260531010000_mcp0b_catalog_seed.sql
20260531020000_mcp0c_seller_promotions.sql
20260531030000_mcp0d_trust_layer.sql
```

These carry the latest timestamps (`20260531…`), correctly ordered after the 44 base migrations. MCP-0E→1G added engines but no new migrations (consistent with EC-1).

---

## Order Integrity

- **0 duplicate timestamp prefixes** → no migration collision.
- MCP migrations timestamp-ordered after base → no broken dependency order.
- `init_role_helpers` (security-definer functions) precedes policy references.

---

## Discrepancy Analysis

EC-1's RLS numbers (170 enable / 254 policies) were **measured at a different tree point**. The consolidated `release/v1-candidate` (which includes `mcp0d_trust_layer` with additional policies) shows **182 / 273**. The EC-1 figure was an *understatement*, not an overstatement — the claim "RLS is strong" is **more** true than EC-1 stated.

---

## Verdict: ✅ PASS

Migration count exact (49), zero duplicates/conflicts, RLS even stronger than claimed (182 enable, 273 policies, 132 functions, 392 indexes, 33 triggers). Database lineage is single and coherent. **All EC-1 database claims TRUE or conservatively understated.**
