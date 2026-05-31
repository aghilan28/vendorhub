# MCP-0D.9 — Support Operations Center

Engine: `lib/trust/support.ts` · Schema: `support_tickets`,
`support_ticket_messages` (RLS). UI: Admin Trust Center → Support tab.

## Capabilities
- **Support tickets** + **issue categories** (order/payment/delivery/product/account/other).
- **Priority routing** (`routeTickets`: urgent → high → medium → low).
- **SLA + escalation**: `SLA_MINUTES` per priority; `isSlaBreached`; breaches
  surfaced.
- **Knowledge base / response metrics**: first-response tracking; avg first
  response.
- **Support analytics**: open, urgent, avg response, SLA breaches, category mix.
- **Support intelligence**: breach + urgent signals feed trust intelligence.

Verified by tests: priority routing puts urgent first; summary computes
open/category mix.
