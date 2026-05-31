# EC-2 Phase 6 — Customer Support Certification

**Module:** `lib/commerce-core/support.ts` (bridge) → canonical engine `lib/marketplace-operations/support.ts` (MCP-1E) · Routes: `/support`, `/seller/support` · Table: `support_tickets` (existing, with `support_priority`/`support_status` enums).

## Approach (reuse-first)
The MCP-1E support engine is already real (ticket lifecycle, SLA, escalation, routing, analytics). EC-2 does **not** rebuild it — it bridges the engine to the existing `support_tickets` DB table.

## Delivered / Confirmed
- **Buyer support** — `/support` route (ticket creation + tracking).
- **Seller support** — `/seller/support` route (resolved EC-1 conflict to ticket version).
- **Ticket lifecycle** — 8-state machine (`open → … → closed`) via `transitionTicket`.
- **Escalation** — `escalateTicket` (level increment + audit).
- **Priority levels** — critical/urgent/high/medium/low with SLA policies.
- **Attachments** — `TicketMessage.attachments` supported in the engine.
- **Admin moderation** — `/admin/operations` Support tab (MCP-1E operations center).
- **Ticket analytics** — `computeSupportAnalytics` (SLA compliance, escalation rate, CSAT, agent performance).
- **Support intelligence** — operational risk detection (MCP-1E `intelligence.ts`).
- **DB persistence bridge** — `toDbSupportRow` / `toDbSupportStatus` map engine tickets → `support_tickets` columns + `support_status` enum.

## Tests: support-bridge mapping test + 49 MCP-1E operations tests (support engine) already in suite.

**Status: COMPLETE (engine real, DB bridge added).**
