# MCP-0F.5 — Order Lifecycle Engine

**Engine:** `lib/commerce-transaction/state-machine.ts`.

A guarded, audited **12-state** machine — a superset of the live 9-state order
machine (`features/transactions/lifecycle.ts`) — adding the mandated
`draft`, `placed`, `completed`, `returned`, `disputed`.

## States & transitions
```
draft            → placed, cancelled
placed           → confirmed, cancelled
confirmed        → packed, cancelled
packed           → shipped, cancelled
shipped          → out_for_delivery, cancelled
out_for_delivery → delivered, cancelled
delivered        → completed, returned, disputed
completed        → returned, disputed
cancelled        → refunded
returned         → refunded, disputed
disputed         → refunded, completed
refunded         → (terminal)
```

## API
- `canTransition(from,to)` / `nextStates` / `sellerNextStates` / `isTerminal`.
- `applyTransition(current,to,actor,note,at?)` → `{ ok, state, event?, error? }`
  (pure, never throws, emits an audited `TransactionEvent`).
- `lifecycleProgress(state)` → monotonic 0..100 on the happy path.
- `toDbOrderStatus` / `fromDbOrderStatus` — maps the richer engine state onto the
  DB `OrderStatus` so the engine drives the real `updateOrderStatusAction`.
- `STATE_META` — label, buyerLabel, tone, terminal, settled per state.

All transition legality + mapping covered by the test suite.
