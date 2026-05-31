# Intelligence Integration Reality Audit (MCP-0E.1)

> Classification of every intelligence system by its **actual** connection to live marketplace data. Source of truth = code at HEAD.

## Classification key
- **Real** — operates on live Supabase marketplace data today.
- **Partial** — real engine, but the live surface runs on sample, or only counts are live.
- **Disconnected** — engine exists but consumes seed/abstract data, not live commerce.
- **Placeholder** — visible surface with no real computation.
- **Missing** — does not exist.

## Inventory

| # | System | Path | Data source today | Class |
|---|---|---|---|---|
| 1 | Seller operational snapshot | `lib/api/queries/seller.ts` | Live `products/inventory/orders/...` | **Real** |
| 2 | Merchant intelligence engine | `features/merchant-intelligence/engine.ts` | Live seller shapes (persisted) | **Real** |
| 3 | Admin governance snapshot | `features/governance/server.ts` | Live `governance_*`, `trust_scores`, `marketplace_disputes` | **Real** |
| 4 | Trust governance counts | `lib/trust/queries.ts` | Live `reviews/disputes/refund_requests/trust_scores` | **Real** |
| 5 | Governance trust/risk engine | `features/governance/trust-engine.ts` | Pure (fed by real signals) | **Real** |
| 6 | Trust layer engine (MCP-0D) | `lib/trust/*` | Real shapes; **surface uses `SAMPLE_TRUST_INPUT`** | **Partial** |
| 7 | Seller OS (MCP-0C) | `lib/seller-os/*` | Real shapes; workspace falls back to `SAMPLE_SELLER_INPUT` | **Partial** |
| 8 | Buyer search / recommendations | `features/intelligence/*`, `lib/ai/*` | Hybrid: real embeddings path + `marketplaceProducts` mock in client hooks | **Partial** |
| 9 | Execution OS | `lib/execution/*` | `buildSeedDataset()` seed only | **Disconnected** |
| 10 | Simulation (tier engines) | `lib/tier10`, `lib/tier14` | Abstract/civilizational | **Disconnected** |
| 11 | Marketplace demand/inventory/pricing intelligence (cross-store) | — | — | **Missing** |
| 12 | Admin marketplace intelligence center | — | — | **Missing** |
| 13 | Intelligence → execution/governance/simulation connectors | — | — | **Missing** |
| 14 | Intelligence workflow engine | — | — | **Missing** |

## Connection map (before MCP-0E)

```
Live commerce data ──▶ Seller snapshot ──▶ Merchant intelligence ──▶ seller dashboard (REAL)
Live commerce data ──▶ Governance/Trust counts ──▶ admin governance/trust (REAL counts; trust views = SAMPLE)
                       Execution OS  ◀── seed only (NO live link)
                       Simulation    ◀── abstract (NO live link)
```

The flagship loop **intelligence → recommendation → execution → outcome** is **not connected** to live commerce. That is the core deficiency MCP-0E closes.

## Connection map (target, after MCP-0E)

```
Live commerce data
   └─▶ Live Marketplace Data Fabric (lib/marketplace-intelligence/fabric)
         ├─▶ Demand Intelligence
         ├─▶ Inventory Intelligence
         ├─▶ Pricing Intelligence
         ├─▶ Marketplace Health / Risk / Growth
         ├─▶ Buyer Intelligence
         └─▶ Recommendations + Insights
               ├─▶ Intelligence Workflow Engine (6 workflows → actions)
               ├─▶ Execution activation (Decision→Initiative+ActionPlan, source="commerce")
               ├─▶ Governance activation (risk → RiskSignal/case payload)
               └─▶ Simulation activation (scenario projected on live fabric)
```

## Decisions taken for MCP-0E
1. **Reuse, don't duplicate.** Seller/merchant/trust/governance engines are reused; MCP-0E adds the missing marketplace-wide fabric, engines, connectors and surfaces around them.
2. **Honest degradation.** Live when Supabase configured; otherwise a clearly-labelled deterministic sample drives *preview only* — never live counts.
3. **Extend, don't fork, execution.** Add `commerce` to `IntelligenceSource` so commerce intelligence is a first-class activation source.
