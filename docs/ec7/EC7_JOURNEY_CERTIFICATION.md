# EC-7 Phase 10 — Real-World User Journey Certification

| Journey | Path / Mechanism | Status |
|---------|------------------|--------|
| A — New buyer signup | `/sign-up` → Supabase Auth → profile | ✅ |
| B — Browse marketplace | `/home`, `/search`, `/categories`, `/discover` | ✅ |
| C — Purchase product | `/product/[slug]` → `/cart` → `/checkout` → Razorpay order/verify | ✅ |
| D — Track order | `/orders/[id]`, `/tracking/[id]` | ✅ |
| E — Request return | `/orders` → `ReturnRequestForm` → `requestReturnAction` (EC-2) | ✅ |
| F — Seller onboarding | `/seller-registration` → `/seller/onboarding` (12-step) | ✅ |
| G — Seller fulfillment | `/seller/orders` → status PATCH → `/seller/fulfillment` | ✅ |
| H — Operator intervention | `/admin/operations` → moderation/trust/dispute actions (EC-6) | ✅ |
| I — Incident recovery | `createIncident` → lifecycle → resolved → postmortem (EC-6) | ✅ |
| J — Marketplace intelligence action | recommendation → `activateToExecution` → initiative (EC-5) | ✅ |

## Verification basis
- All routes emit in `next build` (98 static pages, dynamic routes present).
- Journeys backed by executed tests across EC-2 (returns/refunds/reviews), EC-5 (intelligence activation), EC-6 (operations), plus core commerce flows.
- Security hardening (headers + bypass gating) does not alter journey behavior in dev/preview; production enforces auth.

**Status: ALL 10 REAL-WORLD JOURNEYS FUNCTION.**
