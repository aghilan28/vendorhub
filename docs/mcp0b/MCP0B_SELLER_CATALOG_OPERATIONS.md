# MCP-0B.10 — Seller Catalog Operations

Route: `/seller/catalog` · Component `features/catalog/components/seller-catalog-ops.tsx`.
Complements single-product create/edit (`lib/actions/products.ts`) + Media Center (MCP-0A).

| Capability | Status |
|------------|--------|
| Create / edit product | ✅ existing `createProductAction` / `updateProductAction` |
| Delete product | ✅ existing action |
| Bulk create | ✅ paste CSV → validate (taxonomy + attributes) → publishable count → commit |
| Bulk edit | ✅ same console |
| Bulk inventory update | ✅ `sku,price,stock` planner; invalid rows blocked |
| Bulk pricing update | ✅ same planner (negative price blocked) |
| Bulk media update | ✅ via MCP-0A Seller Media Center |
| Catalog health | ✅ publishable / blocked / average-quality stats |
| Catalog quality | ✅ per-row quality bands |

## Behaviour
- Every bulk row is validated by the same engine as admin ingestion (single
  source of truth), so seller and admin see identical verdicts.
- Invalid/negative rows are blocked from commit; valid + warning rows are
  publishable. Commit wires to the existing product/inventory actions.
