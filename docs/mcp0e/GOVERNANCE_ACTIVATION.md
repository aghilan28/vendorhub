# Governance Activation (MCP-0E.10)

**Module:** `lib/marketplace-intelligence/activation.ts` → `activateToGovernance(rec)`
**Connects to:** `features/governance/trust-engine.ts` (the real governance risk/enforcement engine)

## Mapping
Trust and seller risks are routed to governance rather than execution:
- `recommendation.kind === "trust_risk"` → `RiskSignal { type: "REVIEW_MANIPULATION" }`
- `recommendation.kind === "seller_risk"` → `RiskSignal { type: "SELLER_MANIPULATION" }`
- Severity maps `critical→critical`, `warning→high`, `watch/opportunity→medium`, `info→low`; score carries the recommendation's rank.

The signal is passed to the existing `recommendedEnforcement(signal)` → `GovernanceEnforcementType` (e.g. `MANUAL_REVIEW`, `SELLER_THROTTLE`, `PAYOUT_HOLD`, `WARNING`) and `isReversibleEnforcement(type)` — **reusing** the governance engine, not duplicating it.

## Result
`GovernanceActivation { signal, enforcement, reversible }` — a trust/seller risk detected from live marketplace activity becomes a governance signal with a recommended, reversibility-aware enforcement, ready for the existing Admin Trust / Governance surfaces and RPCs (`apply_governance_enforcement`).

## Verified
Journey D asserts a governance-activated recommendation yields a valid signal type, enforcement and reversibility flag.
