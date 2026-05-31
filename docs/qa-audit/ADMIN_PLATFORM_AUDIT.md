# Admin Platform Audit

**Method:** Source code review of admin pages, queries, and APIs on `main`.
**Benchmark:** Internal marketplace operations tooling standards.
**Date:** 2026-05-31

---

## Component Scores

| Component | Status | Evidence |
|-----------|--------|----------|
| Admin dashboard | PRODUCTION_READY | `features/admin/components/dashboard-screen.tsx`, `getAdminOperationalSnapshot()` (222 lines) real DB |
| Marketplace governance | PARTIAL | `/admin/flags`, `governance_cases`, `compliance_flags` tables |
| Trust governance | PARTIAL | `features/trust/components/admin-verification-dashboard.tsx`, `trust_scores` |
| Catalog governance | PARTIAL | `lib/catalog-governance/engine.ts`; `/admin/categories` |
| Seller governance | PRODUCTION_READY | `/admin/vendors`, `/admin/vendors/[id]`, `/api/admin/moderation/vendor` |
| Customer governance | WEAK | No dedicated customer management page on main |
| Operations | DEMO_ONLY (branch) | `/admin/operations` (MCP-1E) on unmerged branch |
| Incidents | DISCONNECTED (main) | Incident mgmt on MCP-1E branch only |
| Disputes | DISCONNECTED (main) | Dispute resolution on MCP-1E branch only |
| Growth | MISSING (main) | `/admin/growth` (MCP-1D) on unmerged branch only |
| Intelligence | DEMO (main) | `/admin/intelligence` (MCP-0E) on branch; tier APIs disconnected |
| Moderation | PRODUCTION_READY | `/admin/moderation`, `/moderation/products`, `/moderation/reviews`, `/api/admin/moderation/product` |
| Order oversight | PRODUCTION_READY | `/admin/orders` real DB |
| Refunds | PARTIAL | `/admin/refunds` with finance oversight + refunds screen |
| Audit logs | PARTIAL | `/admin/audit-logs` reads `audit_logs` table |
| Platform health | PLACEHOLDER | `/admin/platform-health-placeholder` |
| Settings | PARTIAL | `/admin/settings` basic |

---

## Evidence Detail

- **Real admin data path:** `lib/api/queries/admin.ts` (222 lines) — `getAdminOperationalSnapshot()` reads vendors, orders, refund_requests with proper typing and role-gating via `requireRole`.
- **Moderation is real:** POST endpoints update DB and apply governance actions.
- **RBAC enforced:** middleware checks `user_roles` for ADMIN/SUPER_ADMIN before any `/admin` route.

---

## Critical Findings

1. **Core admin governance is real** — vendor management, moderation, order oversight, refunds all read/write real data.
2. **Operations/Incidents/Disputes/Growth are branch-only** — the unified operations center (MCP-1E) and growth ops (MCP-1D) are not on main.
3. **Platform health is a placeholder** — navigation points to `/admin/platform-health-placeholder`.
4. **No customer management** — admins can govern sellers and orders but there is no dedicated customer-account governance surface on main.

---

## Verdict

**Score: 6/10.** The admin platform has a genuinely real core (dashboard, vendors, moderation, orders, refunds with real DB and RBAC). It is the most production-grade role surface after buyer commerce. Gaps: operations/incident/dispute centers (branch-only), customer governance (missing), platform health (placeholder). Versus internal tooling standards, it covers the essentials but lacks the operational depth that exists on unmerged branches.
