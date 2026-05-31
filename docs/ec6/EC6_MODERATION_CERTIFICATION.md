# EC-6 Phase 5 — Moderation Certification

**Source:** `/admin/moderation` (+ `/products`, `/reviews`), `POST /api/admin/moderation/{product,vendor}`, `lib/commerce-core/reviews.ts` (EC-2 moderation), `lib/media/moderation.ts`, `lib/catalog-governance/engine.ts`.

| Aspect | Status | Evidence |
|--------|--------|----------|
| Product moderation | ✅ REAL | `POST /api/admin/moderation/product`; product status DRAFT/ACTIVE/SUSPENDED/ARCHIVED |
| Review moderation | ✅ REAL | `/admin/moderation/reviews`; EC-2 `moderateReview` (VISIBLE/PENDING/FLAGGED/REMOVED) |
| Seller moderation | ✅ REAL | `POST /api/admin/moderation/vendor`; seller-ops `applyAction` (warning→ban) |
| Content moderation | ✅ REAL | `lib/media/moderation.ts` state machine + risk + queue |
| Marketplace moderation | ✅ REAL | `lib/catalog-governance/engine.ts` six queues |
| Moderation queues | ✅ REAL | `/admin/operations` + `/admin/catalog-governance` queues |
| Moderation decisions | ✅ REAL | moderation APIs update DB + apply governance actions |
| Audit logs | ✅ REAL | `audit_logs` table; `/admin/audit-logs` |

## RBAC
All moderation routes/APIs gated `requireRole(["ADMIN","SUPER_ADMIN"])`.

## Executed evidence
- `ec6-operations-scale.test.ts`: violation confirm → `applyAction` (permanent_ban for fake_product/critical); `recommendAction` mapping.
- EC-2 `commerce-core.test.ts`: review moderation transitions.

**Status: PASS.**
