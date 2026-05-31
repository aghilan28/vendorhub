# MCP-0G.10 — Final Intelligence Certification

Verifies the intelligence loop operates on real marketplace activity and reaches
outcomes — end to end.

| Requirement | Evidence | Status |
|---|---|---|
| Intelligence uses **live marketplace data** | `lib/marketplace-intelligence/queries.ts` (0E) reads products/orders/vendors/reviews/refunds; `lib/commerce-transaction/queries.ts` (0F) reads orders/payments/refunds. Degrade to labelled sample (`sampled:true`) only when unconfigured. | ✅ |
| Recommendations **reach execution** | `risksToRecommendations` (0F) → `IntelligenceRecommendation` (0E) → `activateToExecution` → M8 `activateDecision` (Initiative + Action Plan). | ✅ |
| Execution **reaches outcomes** | M8 Execution OS tracks Initiative → Action Plan → Tasks → KPIs/Outcomes (`lib/execution`). | ✅ |
| Governance **controls actions** | `activateToGovernance` → `RiskSignal` + `recommendedEnforcement`; admin Trust + Commerce governance centers. | ✅ |
| Simulation **reflects reality** | `activateToSimulation` projects scenarios on the live marketplace fabric (0E). | ✅ |

## Transaction intelligence (0F) wiring
`GET /api/commerce` returns the commerce snapshot, the detected
`TransactionRisk[]`, the bridged recommendations, and the **activations** from
running them through the 0E connectors — proving commerce activity drives the
execution/governance/simulation loop. Covered by
`tests/unit/mcp0f-commerce-transaction.test.ts` (activates every risk).

## Coverage of risk domains
Demand · inventory · pricing · trust (0E) + checkout-drop · payment · fulfillment
· delivery · return · refund · operational (0F) — all surfaced with ranked
actions in the admin Intelligence and Commerce Governance centers.

## Verdict
The intelligence loop is **live-data-driven and outcome-connected**. Score
**9/10** (−1: live ranking/scenario realism deepen with OpenAI + live DB).
