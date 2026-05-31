# MCP-0E Baseline Audit — Live Commerce Intelligence Activation

> Evidence-based. Every claim cites a real file path verified at HEAD (`feat/mcp0d-trust-layer` → branched to `feat/mcp0e-intelligence-activation`). Prior phase claims were NOT trusted; this audits actual integration.

## 1. Method

Repository state is the source of truth. The audit reads the real data-access layer, the intelligence engines, and the execution/governance/simulation layers, then classifies each as **Real / Partial / Disconnected / Placeholder / Missing** against one test only: *does it operate on live marketplace data and feed an operable workflow?*

## 2. What already exists (verified)

### Real & live (consumes real Supabase data)
| Subsystem | Entry point | Evidence |
|---|---|---|
| Seller intelligence | `lib/api/queries/seller.ts → getSellerOperationalSnapshot()` | Reads `products`, `inventory`, `orders`, `order_items`, `inventory_movements`, `seller_payout_attributions`; runs `buildMerchantIntelligence(...)`; **persists** to `seller_intelligence_snapshots`/`_alerts` + RPC `record_seller_forecast_observability`. |
| Merchant intelligence engine | `features/merchant-intelligence/engine.ts → buildMerchantIntelligence` | Real per-seller demand/inventory/fulfilment/pricing/discoverability over live shapes. |
| Admin governance | `features/governance/server.ts → getAdminGovernanceSnapshot()` | Real reads of `governance_cases`, `governance_risk_signals`, `marketplace_disputes`, `governance_enforcement_actions`, `trust_scores`. |
| Trust governance counts | `lib/trust/queries.ts → getTrustGovernanceCounts()` | Real counts of `reviews`, `marketplace_disputes`, `refund_requests`, `trust_scores`; honest-empty when unconfigured. |
| Governance trust engine | `features/governance/trust-engine.ts` | `calculateOperationalTrust`, `detectRiskSignals` — pure, real-shape. |

### Engine-real but surface runs on SAMPLE
| Subsystem | Evidence |
|---|---|
| Trust layer (MCP-0D) | `features/trust-os/components/admin-trust-center.tsx` calls `buildTrustSnapshot(SAMPLE_TRUST_INPUT)` — only `getTrustGovernanceCounts()` is live. No real `TrustActivityInput` builder. |
| Seller OS (MCP-0C) | `lib/seller-os/*` operates on real shapes; the workspace falls back to `SAMPLE_SELLER_INPUT` when no session. Live-capable. |

### Disconnected / seed-only / abstract
| Subsystem | Evidence | Classification |
|---|---|---|
| Execution OS | `lib/execution/*` + `features/execution/store.ts` seeded from `buildSeedDataset()`; `app/api/execution/route.ts` computes from seed — **no DB, no live commerce decisions**. `IntelligenceSource` union = research/knowledge/simulation/secis/governance (**no commerce/marketplace member**). | Disconnected |
| Simulation | `lib/tier10`, `lib/tier14` (`simulateTier14Runtime`), `packages/simulation-runtime` — abstract/civilizational; **not wired to commerce data**. | Disconnected |
| Marketplace-wide demand/inventory/pricing intelligence | Per-seller only (merchant-intelligence). No marketplace/category/cross-store engine. | Missing |
| Admin marketplace intelligence center | No `/admin/intelligence` route. | Missing |
| Intelligence → execution / governance / simulation connectors | None. | Missing |

## 3. Degradation behaviour (verified, inconsistent)
- `lib/supabase/server.ts → createSupabaseServerClient()` calls `assertSupabasePublicEnv()` which **throws** when `NEXT_PUBLIC_SUPABASE_*` is missing (`lib/env.ts`). The seller data path therefore throws (caught at the route).
- `lib/trust/queries.ts` instead returns an honest `EMPTY {configured:false}`.
- **MCP-0E decision:** adopt the trust pattern — live data when configured; honest, clearly-labelled fallback otherwise; never silently substitute demo data into live counts.

## 4. Real marketplace data shapes available
- `features/seller/types.ts`: `SellerProduct`, `InventoryItem`, `SellerOrder`, `SellerOrderItem`.
- `lib/trust/types.ts`: `ReviewInput`, `ReturnInput`, `RefundInput`, `DisputeInput`, `SupportTicketInput`, `SellerActivity`.
- DB row types via `@/types/database` (`Tables<...>`).

## 5. The MCP-0E gap (what this phase must build)
1. A **Live Marketplace Data Fabric** — one normalized snapshot over products/inventory/orders/payments/reviews/returns/refunds/disputes/support/trust/promotions/behavior that every engine consumes.
2. **Marketplace-wide** Demand / Inventory / Pricing intelligence engines (product/category/store/marketplace scope).
3. **Activation connectors**: recommendations → execution decisions/initiatives; risks → governance signals/interventions; insights → workflows; scenarios → simulation on live state. Extend `IntelligenceSource` with `commerce`.
4. **Surfaces**: Admin Marketplace Intelligence Center, Seller Intelligence Briefing, Buyer Smart Discovery — live when configured, labelled sample otherwise.
5. A **degrade-safe, admin-gated** real query builder (`getMarketplaceIntelligenceSnapshot`).

## 6. Acceptance restated
MCP-0E is complete only when marketplace activity drives intelligence, intelligence drives recommendations, recommendations drive execution, execution drives outcomes, governance controls decisions, and simulation reflects live marketplace state.
