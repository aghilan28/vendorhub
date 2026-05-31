# MCP-1D — Referral Platform (Phase 4)

`lib/customer-growth/referral.ts` — codes/links, tracking, rewards, fraud
protection, attribution, leaderboards and governance.

## Codes & links

`generateReferralCode(referrerId)` — deterministic FNV-1a hash → 6-char code over
an unambiguous alphabet, prefixed `VH`, plus a `…/sign-up?ref=CODE` link. Stable
and testable; distinct referrers get distinct codes.

## Fraud protection

`assessReferral(record)` runs four checks and accumulates a 0–100 fraud score:

- **self_referral** (+60) — referrer == referee.
- **same_device** (+30) — same device/IP as referrer.
- **velocity** — signup with no qualifying activity.
- **qualification** — referee met ≥ 1 order **and** ≥ ₹299 spend.

Outcome: `flagged` (fraud ≥ 60), else `pending` (not yet qualified), else
`rewarded` (+200 pts to referrer).

## Attribution, leaderboard, summary

- `attributeReferrals(records)` — qualified/rewarded referee spend attributed back
  to referrers, sorted by revenue.
- `buildReferralLeaderboard(records, names)` — ranked by points then rewarded.
- `buildReferralSummary(referrerId, records)` — per-customer totals (pending /
  qualified / rewarded / flagged), points earned, conversion rate + the code.

## Governance

Flagged referrals never auto-reward; they surface for manual review (admin
referral dashboard). Rewards are issued only on genuine qualification.

## Exit criteria — met

Customers can invite customers, see their referral status and conversion, and
earn rewards — with fraud contained.
