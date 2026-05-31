# EC-5 Phase 8 — Governance Impact Certification

**Source:** `features/governance/trust-engine`, `lib/governance/`, `lib/enterprise-governance/`, `activateToGovernance` in `activation.ts`, `/admin/trust`, `/admin/flags`.

| Aspect | Status | Evidence |
|--------|--------|----------|
| Approvals | ✅ REAL | refund/return decision actions (EC-2); vendor/product moderation APIs |
| Policies | ✅ REAL | `recommendedEnforcement(signal)` policy mapping; governance cases |
| Overrides | ✅ REAL | admin override paths in moderation + operations |
| Interventions | ✅ REAL | `RiskSignal` → enforcement type (reversible vs irreversible) |
| Decision recording | ✅ REAL | `audit_logs`; governance decisions carry source + actor |
| Decision lineage | ✅ REAL | recommendation → `activateToGovernance` → signal → enforcement (traceable) |

## Do governance outputs influence operations?
**YES.** `activateToGovernance(rec)` converts a trust/seller-risk recommendation into a `RiskSignal` and computes `recommendedEnforcement` (e.g., suspend/limit/flag), flagging reversibility via `isReversibleEnforcement`. This drives moderation/suspension operations (MCP-1E seller-ops + admin moderation).

## Executed evidence
- `mcp0e-marketplace-intelligence.test.ts` Journey D — trust/seller risk → governance signal + enforcement.
- `ec5-intelligence-impact.test.ts` — a `trust_risk` recommendation → governance signal (severity=critical, score=88) + enforcement + reversibility flag.

**Status: PASS — governance outputs influence operations.**
