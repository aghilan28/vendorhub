# EC-6 Phase 6 — Escalation & Intervention Certification

**Source:** `lib/marketplace-operations/{disputes,incidents,support,seller-ops}.ts`, `features/governance/trust-engine.ts`, `lib/execution/`.

| Aspect | Status | Evidence |
|--------|--------|----------|
| Escalation workflows | ✅ REAL | dispute `escalated` state; `escalateTicket` (level + audit); incident severity escalation |
| Intervention workflows | ✅ REAL | `recommendedEnforcement` → enforcement type; seller `applyAction` |
| Operator actions | ✅ REAL | confirm/dismiss violation, apply action, resolve dispute, transition incident |
| Marketplace actions | ✅ REAL | suspend/throttle/hold/verify enforcement applied to sellers |
| Governance actions | ✅ REAL | RiskSignal → enforcement (reversible flagged) |
| Execution actions | ✅ REAL | `activateDecision` → Initiative + ActionPlan (EC-5 chain) |
| Operator visibility | ✅ REAL | `/admin/operations`, `/admin/trust`, `/admin/flags`, `/admin/execution` |

## Executed evidence
- `ec6-operations-scale.test.ts`: dispute escalation journey (→ `escalated` → resolved); trust enforcement mapping; violation enforcement (permanent_ban).
- EC-5 `ec5-intelligence-impact.test.ts`: recommendation → execution initiative + action plan (intervention executable).

**Status: PASS — escalations and interventions are real and operator-driven.**
