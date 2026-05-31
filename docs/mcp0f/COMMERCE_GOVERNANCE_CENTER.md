# MCP-0F.11 — Commerce Governance Center

**Surface:** `/admin/commerce` →
`features/commerce-transaction/components/commerce-governance-center.tsx`
(admin-gated via `getCommerceGovernanceSnapshot`; labelled sample fallback).
**API:** `GET /api/commerce` (snapshot + recommendations + 0E activations).

## What admins monitor (all mandated)
- **Orders** — throughput (placed→confirmed, shipped→delivered, cancellation/
  return rates) + state distribution.
- **Payments** — success/failure/COD share, method mix, governance signals
  (`paymentGovernanceSignals`).
- **Refunds** — open refunds + refunded value.
- **Deliveries** — delivered/on-time %, per-courier health.
- **Disputes** — open disputes count.
- **Failures** — payment failures + recoverable value; SLA breaches.
- **Operational health** — commerce-loop score + tone.
- **Marketplace throughput** — GMV, AOV, fulfillment rate.

## Tabs
Risks (transaction intelligence + recommended actions) · Orders · Payments ·
Delivery · Post-purchase.

## Governance loop
Detected risks → recommended actions → (via `GET /api/commerce`) activated
through the MCP-0E execution/governance/simulation connectors. Closes Journey E
(admin detect → resolve) and Journey F (intelligence detect → act).
