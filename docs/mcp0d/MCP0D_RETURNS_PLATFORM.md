# MCP-0D.6 — Returns Management Platform

Engine: `lib/trust/lifecycles.ts` (return state machine) · Schema:
`return_requests` (+ `evidence_paths`, RLS).

## Lifecycle
`requested → approved | rejected | cancelled`; `approved → in_transit | cancelled`;
`in_transit → received → resolved`. Enforced by `canTransitionReturn` /
`transitionReturn`.

## Roles (RLS-backed)
- **Buyer**: request return (insert with `buyer_id = auth.uid()`), track, upload
  evidence (`evidence_paths`, MCP-0A storage), communicate, escalate.
- **Seller**: review/approve/reject/resolve (vendor-member RLS).
- **Admin**: intervene/audit/resolve (Trust Governance Center).

Open returns surfaced in the Admin Trust Center. Verified by tests (legal/illegal
transitions).
