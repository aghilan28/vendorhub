# EC-2 Phase 3 — Returns Certification

**Module:** `lib/commerce-core/returns.ts` · Action: `lib/actions/returns.ts` · UI: `components/commerce/return-request-form.tsx` · Table: `return_requests` (existing)

## Delivered
- **Mandated lifecycle** — `REQUESTED → UNDER_REVIEW → APPROVED/REJECTED → IN_TRANSIT → RECEIVED → COMPLETED`. `canTransitionReturn` guards every edge.
- **Customer:** `createReturnRequest` (reason + description validation, evidence paths), `requestReturnAction` (eligibility check against delivery date + 7-day window, writes to `return_requests`, ownership-guarded, degrade-safe), `ReturnRequestForm` client UI.
- **Seller:** `approveReturn` / `rejectReturn` (auto-routes through UNDER_REVIEW), `decideReturnAction` (writes lowercase DB `return_state`).
- **Admin override:** `transitionReturn` accepts admin actor for any legal transition.
- **Refund linkage:** `linkRefund` connects an approved return to a refund.
- **Analytics:** `returnsByStatus`.

## Mandated statuses: ✅ REQUESTED / UNDER_REVIEW / APPROVED / REJECTED / IN_TRANSIT / RECEIVED / COMPLETED.

## Evidence
- Eligibility enforced (delivered + within window).
- Reason restricted to 7 valid enum values; description ≥5 chars.
- Engine status (UPPER) mapped to DB `return_state` enum (lower) in the action.

## Tests: 6 return tests (lifecycle legality, creation validation, approve/reject, eligibility window, refund link, status aggregation).

**Status: COMPLETE.**
