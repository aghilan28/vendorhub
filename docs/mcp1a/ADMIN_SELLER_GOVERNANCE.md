# MCP-1A.7 — Admin Seller Governance

**Engine:** `lib/seller-activation/governance.ts` · **Surfaces:** `/admin/sellers`
(`SellerGovernanceCenter`) + `/admin/population` (operations).

## The six review queues (all mandated)
1. **Seller review** — submitted applications awaiting first review.
2. **Store approval** — under-review stores pending an approval decision.
3. **Verification** — KYC manual-review cases.
4. **Catalog approval** — listings pending catalog review.
5. **Risk** — failed/elevated-risk verification + flagged sellers.
6. **Escalation** — escalated KYC cases (risk ≥ 50) for senior review.

Queue items are severity-ranked then age-ordered. Each carries seller, severity,
summary and age.

## Marketplace oversight
`buildGovernanceSnapshot` also returns: total pending, sellers, active sellers,
pending verification, flagged sellers, and a **marketplace health** score + tone
(weighted by active ratio, flagged ratio, and escalation load).

## Seller intelligence dashboard
The center's Intelligence tab renders `marketplaceRecommendations` (population /
expansion / activation / trust actions on real entities).

## Scale
Engine and surface are list/queue based and paginate naturally — built to manage
**hundreds of sellers**. The `/admin/population` operations center adds the
funnel, KPIs and capacity tracking.

## Exit criteria — met
An admin can review, verify, approve and monitor sellers at scale. Covered by the
governance test (six queues + health).
