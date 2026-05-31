# ADMIN EXPERIENCE AUDIT (Section 5)

Benchmarks: Amazon admin systems, Flipkart operations, enterprise marketplace
back-offices.

| Surface | State | Grade | Evidence / gap |
|---------|-------|-------|----------------|
| Admin dashboard | Real snapshot | 🟡 | `/api/admin/snapshot` → `getAdminOperationalSnapshot` (DB) |
| Store/vendor moderation | Real | ✅ | `moderateVendorAction` via guarded+audited PATCH route |
| Product moderation | Real | ✅ | `moderateProductAction` route present |
| Catalog governance | Real (DB) | 🟡 | `features/governance/server.ts` heavy Supabase + RPC `run_governance_detection` |
| User management | Thin | 🟡 | Role helpers + RLS in migrations; rich user admin UI not found |
| Marketplace analytics | Mixed | 🟡 | Snapshot-derived; some static |
| Operational analytics | Real | ✅ | `/api/operations/health` (`getOperationalHealthSnapshot` runs ~17 parallel DB counts) |
| Commerce Intelligence | **Demo/standalone** | 🧪 | `/api/tier*`, executive-intelligence are deterministic engines, **not wired into admin commerce data** |
| Execution Layer | **Demo/seed** | 🧪 | `/admin/execution` zustand seed, not DB |
| Governance Layer | Real (DB) | ✅ | governance cases/signals/enforcement from DB |

## Brutal summary
- **Strengths:** governance + moderation + operational health are genuinely
  DB-backed with security guards, audit and rate limits — the strongest admin
  area.
- **Weaknesses:** the headline "Commerce Intelligence" and "Execution" admin
  surfaces are **demonstration layers** (seed/deterministic), not connected to
  live marketplace data — they look impressive but do not act on real orders,
  inventory or sellers.
- **Blocking reality:** admins can moderate and observe, but cannot drive the
  "intelligence → execution" loop against real data inside the product.

**Admin Experience score: 5/10.**
