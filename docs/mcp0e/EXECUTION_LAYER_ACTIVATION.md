# Execution Layer Activation (MCP-0E.9)

**Module:** `lib/marketplace-intelligence/activation.ts`
**Connects to:** `lib/execution` (M8 Execution OS)

## The link that was missing
Before MCP-0E, the Execution OS ran on a seed dataset and `IntelligenceSource` had no commerce member — commerce intelligence could not become executable work. MCP-0E:
1. Extends `IntelligenceSource` (+ `INTELLIGENCE_SOURCES`) with **`"commerce"`** in `lib/execution/types.ts`.
2. Adds `recommendationToDecision(rec)` → an execution `Decision` with `source: "commerce"`.
3. Adds `activateToExecution(rec, opts)` → calls the existing `activateDecision(decision)` to produce a linked **Initiative + Action Plan**.

## Mapping
- Forecasts / inventory / pricing / growth recommendations → **execution** activation.
- Each produced `ActionPlan.links[0]` carries `{ source: "commerce", refId: rec.id, label }` — full lineage from a marketplace recommendation back through the workflow to the initiative.
- The decision is returned in `status: "activated"`, the initiative in `status: "planned"`.

## Result
Recommendations drive execution. A stockout recommendation, a price-optimization opportunity, or a growth play becomes an owned, tracked initiative inside the existing Execution workspace — no manual re-entry. Verified by Journeys A, C and E in `tests/unit/mcp0e-marketplace-intelligence.test.ts`.

## Honest scope
The Execution OS persists client-side (zustand) as built in M8; MCP-0E supplies the activation connectors and source lineage. Server-side persistence of activated commerce decisions is a documented follow-up, not a blocker.
