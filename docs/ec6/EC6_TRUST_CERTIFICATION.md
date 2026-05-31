# EC-6 Phase 4 — Trust & Safety Certification

**Source:** `features/governance/trust-engine.ts`, `lib/marketplace-operations/seller-ops.ts`, `/admin/trust`, `/seller/reputation`.

| Aspect | Status | Evidence |
|--------|--------|----------|
| Seller trust scoring | ✅ REAL | `calculateOperationalTrust(input)` → score + `trustLevelForScore`; `computeSellerHealth` |
| Fraud detection | ✅ REAL | `detectRiskSignals` (PAYOUT_ABUSE, CANCELLATION_SPIKE, etc.) |
| Risk detection | ✅ REAL | risk signals from orders/cancellations/refunds/disputes/failedDeliveries/flags/payouts |
| Suspicious activity | ✅ REAL | velocity + ratio heuristics in risk signals |
| Marketplace abuse detection | ✅ REAL | refund-fraud + review-manipulation + seller-manipulation signal types |
| Trust interventions | ✅ REAL | `recommendedEnforcement(signal)` → PAYOUT_HOLD / SELLER_THROTTLE / VERIFICATION_REQUIRED / suspend |
| Trust reporting | ✅ REAL | `/admin/trust` governance counts; `governancePressure` |
| Trust governance | ✅ REAL | `isReversibleEnforcement` flags reversibility for audited enforcement |

## Executed evidence
- `governance-trust-engine.test.ts` (5): risk signal → enforcement mapping (PAYOUT_HOLD, SELLER_THROTTLE, VERIFICATION_REQUIRED).
- `ec6-operations-scale.test.ts`: `detectRiskSignals` over a high-risk seller → enforcement + reversibility for every signal.

**Status: PASS.**
