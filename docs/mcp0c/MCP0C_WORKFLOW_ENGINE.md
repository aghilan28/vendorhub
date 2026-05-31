# MCP-0C.11 — Seller Workflow Engine

Engine: `lib/seller-os/workflow.ts` · UI: Intelligence tab → Active workflows.

## Workflows
low_stock · promotion · price_change · store_verification · catalog_approval ·
return · refund — each with a defined state set and description.

## State machine
`idle → triggered | in_progress`; `triggered → in_progress | idle`;
`in_progress → blocked | completed`; `blocked → in_progress`; `completed`
terminal. Enforced by `canTransition`.

## Trigger detection
`detectWorkflows(derived)` inspects the live operating state and surfaces
triggered workflows:
- **low_stock** when products are at/below reorder point;
- **store_verification** when the store is unverified;
- **price_change** when products are below the margin threshold;
- **return** when delivered orders are return-eligible.

Verified by tests: legal/illegal transitions; low_stock triggered on the sample
(real-shaped) snapshot.
