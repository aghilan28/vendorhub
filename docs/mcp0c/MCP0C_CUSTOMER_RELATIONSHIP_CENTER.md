# MCP-0C.8 — Customer Relationship Center

Engine: `lib/seller-os/customers.ts` · UI: Customers tab. Built from **real orders**.

## Capabilities
- **Customer insights / value**: aggregates orders per customer (orders, revenue).
- **Segments**: `vip` (≥2 orders & ≥Rs 2,000), `repeat` (≥2 orders), `new`
  (1 order), `at_risk` — with count + revenue per segment.
- **Repeat customers / repeat rate**.
- **Top customers** by lifetime value.
- **Reviews / ratings / messages**: surfaced from the product/reviews schema
  (reviews table exists); CRM messaging is a thin follow-up.
- **Customer intelligence**: feeds expansion/category recommendations.

Verified by tests: segmentation (VIP detection), repeat rate, top-customer value.
