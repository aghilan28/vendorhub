# MCP-0F.9 — Transaction Intelligence

**Engine:** `lib/commerce-transaction/intelligence.ts` · **Surfaces:**
`/admin/commerce` Risks tab, `GET /api/commerce`.

Operates on **real** transaction activity (orders, payments, shipments, returns,
refunds) — not seed data.

## Risk kinds
`checkout_drop` · `payment_risk` · `fulfillment_risk` · `delivery_risk` ·
`return_risk` · `refund_risk` · `operational_risk`. Each carries severity, scope,
title, detail, recommended action and a 0..100 score; ranked descending.

## Throughput
`buildThroughput` → orders, GMV, AOV, placed→confirmed %, shipped→delivered %,
cancellation/return/refund rates, fulfillment rate.

## Health
`buildTransactionIntelligence` → 0..100 commerce-loop score (fulfillment +
payment success + fulfillment rate − cancellations/returns − critical risks) +
tone.

## MCP-0E activation (the connection)
`risksToRecommendations` converts each `TransactionRisk` into an MCP-0E
`IntelligenceRecommendation` with an activation target:
- payment/fulfillment/delivery/refund/operational → **execution** (initiative +
  action plan via `activateDecision`),
- return → **governance** (risk signal + enforcement),
- checkout_drop → **simulation** (scenario on the live fabric).

`activateRecommendations` (the existing 0E connectors) runs them; the test suite
activates every transaction risk end-to-end through `activateRecommendation`.
