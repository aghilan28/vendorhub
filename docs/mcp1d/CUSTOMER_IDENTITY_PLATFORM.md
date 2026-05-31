# MCP-1D — Customer Identity Platform (Phase 2)

`lib/customer-growth/identity.ts` turns a thin buyer account into a rich,
persistent identity that every growth engine consumes.

## Capabilities

- **Profile completion** (`computeProfileCompletion`) — weighted across 9 fields
  (name, email + verification, phone + verification, saved address, city/pincode,
  interests, preferred categories). Returns score 0–100, completed/missing fields
  and the highest-weight **next-best field**.
- **Lifecycle staging** (`deriveLifecycle`) — `visitor → new → active → loyal →
  at_risk → dormant → churned → reactivated` from recency + frequency.
- **Customer value score** (`computeValueScore`) — RFM-style 0–100: recency 30%,
  frequency 30%, monetary 30%, engagement 10%, minus a returns penalty. A
  never-ordered customer scores 0 (no fabricated value).
- **Segmentation** (`deriveSegment`) — `vip / loyal / promising / new / bargain /
  at_risk / dormant` from value score + lifecycle.
- **Trust indicators** — verified email/phone, repeat customer, contributor,
  complete profile.
- **Account health** — completion 40% + value 60% minus a lifecycle penalty.

## Output

`buildCustomerIdentity(profile)` → `CustomerIdentity { name, completion,
lifecycle, segment, valueScore, trustIndicators, accountHealth, recency,
frequency, monetary }`.

## Exit criteria — met

Customer identity is rich (completion, interests, saved entities, segment,
lifecycle, value) and persistent (derived from real order activity in
`queries.ts`; degrade-safe to the labelled sample).
