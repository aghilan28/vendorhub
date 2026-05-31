# MCP-0D.8 — Dispute Resolution System

Engine: `lib/trust/lifecycles.ts` (dispute state machine). Reuses existing
`marketplace_disputes` + `dispute_evidence`.

## Case workflow
`open → evidence | dismissed`; `evidence → arbitration | dismissed`;
`arbitration → resolved_buyer | resolved_seller | dismissed`. Enforced by
`canTransitionDispute` / `transitionDispute`.

## Capabilities
- **Dispute cases** (`marketplace_disputes`), **evidence upload**
  (`dispute_evidence` + MCP-0A storage), **communication timeline**, **admin
  arbitration** (Trust Governance Center), **resolution tracking** + **audit
  trail** (`trust_audit_events`).

Open disputes count is real (`getTrustGovernanceCounts`) and feeds the
trust-degradation insight. Verified by tests (arbitration transitions).
