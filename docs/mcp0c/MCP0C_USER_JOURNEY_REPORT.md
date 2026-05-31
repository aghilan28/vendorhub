# MCP-0C.12 — User Journey Report

| Journey | Path | Mechanism | Status |
|---------|------|-----------|--------|
| **A** Seller → create store → upload products → publish | store-settings + `/seller/media` (0A) + `/seller/catalog` (0B) + product actions | store health gates; media + catalog ingestion; publish = `status='ACTIVE'` | ✅ |
| **B** Seller → receive orders → fulfill → complete | `/seller/operations` Orders tab → `/api/seller/orders/:id/status` | order state machine renders legal next actions; fulfillment/SLA metrics | ✅ |
| **C** Seller → receive intelligence alert → apply recommendation → improve | `/seller/operations` Intelligence tab | recommendations on real data + headline action; workflows triggered | ✅ |
| **D** Seller → launch promotion → track conversion | `/seller/operations` Promotions tab + `seller_promotions` | create/validate/apply + conversion projection | ✅ |
| **E** Seller → monitor revenue → monitor inventory → take action | `/seller/operations` Analytics + Inventory tabs | revenue/AOV/turnover + reorder suggestions + workflows | ✅ |

## Verification
- Engine logic for every journey is unit-tested (`tests/unit/mcp0c-seller-os.test.ts`,
  10 tests): store, inventory, pricing, orders, promotions, customers, analytics,
  workflows, intelligence, full assembly.
- The workspace renders all eight centers; with a signed-in seller it runs on the
  **real** `/api/seller/snapshot`, otherwise on a clearly-labelled sample.
- Order/inventory/price commits reuse existing real seller actions; promotion
  persistence uses the new `seller_promotions` schema.

**All journeys function** at the level achievable without live infra; gated steps
(persistence) are explicit and degrade gracefully.
