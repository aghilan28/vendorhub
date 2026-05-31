# Intelligence Workflow Engine (MCP-0E.12)

**Module:** `lib/marketplace-intelligence/workflows.ts` → `buildIntelligenceWorkflows(recommendations)`

## Six workflows (all produce actions)
| Workflow | Owner | Fed by recommendation kinds |
|---|---|---|
| Demand Risk | Demand Planning | `marketplace_action`, `demand_forecast` |
| Inventory Risk | Inventory Lead | `stockout_risk`, `overstock_risk`, `reorder` |
| Price Optimization | Pricing Lead | `price_optimization`, `promotion` |
| Trust Risk | Trust & Governance | `trust_risk` |
| Seller Risk | Seller Success | `seller_risk` |
| Marketplace Growth | Growth | `growth_opportunity` |

## How it works
Recommendations are produced by `assembleRecommendations` (unified, ranked, de-duplicated). Each workflow filters the recommendations it owns and emits `WorkflowAction[]` (`{ owner, priority, title, detail, sourceRecommendationId }`). A workflow is `triggered` when it has ≥ 1 matching recommendation; every triggered workflow yields actions.

Actions carry `sourceRecommendationId`, preserving the chain **activity → fabric → engine → recommendation → workflow action → activation (execution/governance/simulation)**.

## Verified
Tests assert exactly six workflows (`WORKFLOW_DEFS.length === 6`), that at least one triggers on the sample, and that every triggered workflow has actions.
