# EC-6 Phase 10 — Operator Journey Certification

| Journey | Mechanism | Status |
|---------|-----------|--------|
| A — Fraudulent seller detected | `detectRiskSignals` → `recommendedEnforcement` → `createViolation`/`applyAction` (permanent_ban) | ✅ |
| B — Dispute escalated | `createDispute` → `submitEvidence` → `transitionDispute(escalated)` → `resolveDispute` | ✅ |
| C — Review moderation | EC-2 `moderateReview` (flag/remove/restore); `/admin/moderation/reviews` | ✅ |
| D — Marketplace intervention | operational risk recommendation → `activateToExecution` → Initiative + ActionPlan | ✅ |
| E — Incident resolution | `createIncident` → lifecycle → `resolved` → `addPostmortem` | ✅ |
| F — Trust enforcement | `detectRiskSignals` → enforcement (PAYOUT_HOLD/SELLER_THROTTLE/VERIFICATION_REQUIRED), reversibility flagged | ✅ |
| G — Operational alert | `generateAlerts` (threshold) → severity + suggested action in `/admin/operations` | ✅ |
| H — Governance approval | `activateToGovernance` → RiskSignal + enforcement; admin moderation approve/reject | ✅ |

## Verification basis
- Executed in `ec6-operations-scale.test.ts` (A fraud→ban, B dispute escalation, E incident lifecycle, F trust enforcement) + existing `marketplace-operations.test.ts` (49) and `governance-trust-engine.test.ts` (5).
- D & H proven by EC-5 activation tests (`ec5-intelligence-impact.test.ts`).
- C proven by EC-2 `commerce-core.test.ts` review moderation.
- All operator surfaces emit in `next build`.

**Status: ALL 8 OPERATOR JOURNEYS FUNCTION.**
