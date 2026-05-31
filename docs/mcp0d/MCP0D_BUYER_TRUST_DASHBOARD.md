# MCP-0D.11 — Buyer Trust Dashboard

Engine: `lib/trust/buyer.ts` (`buildBuyerTrustSignals`) · Component:
`features/trust-os/components/buyer-trust-panel.tsx`, rendered on
`/product/[slug]`.

## Buyer sees
- **Verified seller** + **verified product** indicators.
- **Seller trust score** + **product trust score**.
- Trust **signals**: verified seller, seller/product trust, rating, verified-review %, return risk — each ok/attention.
- **Return + refund policies** (7-day returns; refund to original method).
- **Marketplace guarantees**: buyer protection, verified-purchase reviews, secure payments.

Derived from the product's **real** rating + review count + vendor verification.
Replaces the prior placeholder-only product trust experience. Verified by tests
(signals + guarantees built).
