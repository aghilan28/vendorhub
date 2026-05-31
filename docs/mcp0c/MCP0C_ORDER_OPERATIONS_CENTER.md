# MCP-0C.6 — Order Operations Center

Engine: `lib/seller-os/orders.ts` · UI: Orders tab. Commits via existing
`/api/seller/orders/:id/status`.

## Order state machine (next legal actions)
| Status | Actions |
|--------|---------|
| pending | accept, reject |
| confirmed | process, cancel |
| processing / packed | ship, cancel |
| shipped / out_for_delivery | complete |
| delivered | refund |
| cancelled / refunded | (terminal) |

## Capabilities
- **View / accept / reject / process / ship / track / complete** orders — the UI
  renders only the legal next actions per order.
- **Cancellations / returns / refunds**: surfaced via actions + return/refund
  workflows.
- **Fulfillment monitoring**: open count, needs-action count, fulfillment rate,
  cancellation rate, and **SLA risk** (open orders with ≤20 min promised time).

Verified by tests: `nextActions` per status, open/needs-action counts, SLA risk.
