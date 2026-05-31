# MCP-1D — Customer Growth Center (Phase 9)

Buyer surface at **`/rewards`** (protected) — `app/(buyer)/rewards/page.tsx` +
`features/customer-growth/components/customer-growth-center.tsx`.

## What the customer sees

Headline stats (loyalty tier, points balance, referrals rewarded, profile
completion) plus six tabs:

1. **Loyalty** — tier + progress bar to next tier, perks, and an interactive
   **redeem** list (gated by balance/tier via `redeemReward`).
2. **Referrals** — referral code + copy-link, invite stats and conversion.
3. **Offers** — active campaigns the customer is eligible for (by segment).
4. **For you** — personalized recommendations + interests.
5. **Activity** — engagement feed + personalized growth opportunities.
6. **Journey** — lifecycle, segment, value score, account health, briefing and
   trust indicators.

## Data

Server reads `getCustomerGrowthSnapshot()` (real signed-in order activity →
identity + loyalty; degrade-safe to the labelled sample, `sampled: true`). The UI
labels Live vs Preview honestly.

## Exit criteria — met

The customer understands the value they receive: rewards, referrals, offers,
recommendations, growth opportunities and their journey — in one place.
