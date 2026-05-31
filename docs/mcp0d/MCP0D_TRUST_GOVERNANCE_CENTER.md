# MCP-0D.12 — Trust Governance Center

Route: `/admin/trust` (admin-gated, force-dynamic) · Component
`features/trust-os/components/admin-trust-center.tsx` · Real counts via
`lib/trust/queries.ts` (`getTrustGovernanceCounts`).

## Admin can monitor
- **Marketplace trust** score + tone.
- **Abuse / fraud** (trust intelligence tab: review fraud, refund/return abuse).
- **Returns / refunds / disputes** (open counts + lifecycle).
- **Reputation** (per-seller operational reputation + badges).
- **Support** (queue, SLA, category mix).

## Real vs preview (honest)
When Supabase is configured, a **live counts** strip shows real reviews, flagged
reviews, disputes, refund requests and trusted sellers
(`getTrustGovernanceCounts`). The rich per-entity engine views run on a labelled
sample for preview; the engine itself operates on real shapes and runs on real
data once a full activity query is wired (documented integration point).
