# MCP-1C.5 — Serviceability Engine Certification

**Engine:** `lib/hyperlocal/serviceability.ts` (reuses lib/geo `distanceKm`).

## Determines (all mandated)
**Can deliver? / Cannot deliver? / Why?** — `evaluateServiceability` returns
`{ status, canDeliver, reason, distanceKm, radiusKm, checks, score, confidence }`.

## Six validation checks
1. **Coverage** — store has a configured radius + coordinates.
2. **Distance** — buyer↔store distance computable.
3. **Radius** — distance ≤ service radius.
4. **Zone** — buyer zone served (when zones configured).
5. **Operational** — store under capacity.
6. **Risk** — fulfillment rate ≥ 70% and not overloaded.

## Status + score + confidence
- Status: `serviceable` / `limited` (edge-of-zone or near-capacity) /
  `not_serviceable` (outside radius or zone) / `unknown` (no location/coverage).
- **Serviceability score** — passed checks / total.
- **Serviceability confidence** — score blended with proximity (closer = higher).

## Exit criteria — met
Serviceability is computed deterministically with explicit reasons, a score and a
confidence. **Certified.** (2 serviceability tests incl. zone restriction.)
