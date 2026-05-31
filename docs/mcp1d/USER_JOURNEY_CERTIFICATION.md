# MCP-1D — User Journey Certification (Phase 12)

All five mandated journeys function and are covered by automated tests in
`tests/unit/mcp1d-customer-growth.test.ts` (suite "MCP-1D.12 mandatory user
journeys").

## Journey A — register → complete profile → personalized experience
A new customer (`joinedDaysAgo: 1`, no orders) yields lifecycle `new`, a profile
with a **next-best field** to complete, and a non-empty personalized
recommendation set. **Certified.**

## Journey B — earn reward → redeem reward
The sample ledger builds a loyalty account with a positive balance; redeeming the
top eligible option succeeds and decrements the balance by the option cost.
**Certified.**

## Journey C — refer friend → receive referral reward
A referral with a qualifying referee (≥ 1 order, ≥ ₹299) is assessed `rewarded`
with > 0 reward points; a self/same-device referral is `flagged`. **Certified.**

## Journey D — admin create campaign → launch → monitor results
A valid draft passes `validateCampaign`; once active with measured metrics it
reports CTR and ROAS > 0 via `buildCampaignReport`. **Certified.**

## Journey E — intelligence detect churn risk → recommend retention action
`buildGrowthIntelligence` over the sample base emits a `churn_risk` /
`retention_risk` recommendation carrying a concrete retention action.
**Certified.**

## Surfaces exercised

`/rewards` (Journeys A–C) · `/admin/growth` + `GET /api/growth` (Journeys D–E).
Both surfaces are degrade-safe and render the labelled sample when Supabase is
unconfigured.
