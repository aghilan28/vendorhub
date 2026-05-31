# MCP-1C.3 — Address Intelligence Platform

**Engine:** `lib/hyperlocal/address.ts`.

## Capabilities (all mandated)
- **Address parsing** — `parseAddress` (structured fields, or split a freeform
  `raw` string + extract pincode).
- **Address validation** — `analyzeAddress` → `{ valid, issues }` (line/city/
  pincode + recipient/phone for buyer/delivery).
- **Address completion** — `completeAddress` fills city/state from pincode hints.
- **Address suggestions** — completion suggestions (city/state/locality).
- **Address verification** — deliverable flag (valid + valid pincode).
- **Duplicate detection** — `deduplicateAddresses` (normalized line1+pincode).
- **Location confidence** — 0–100 (completeness + pincode + coordinates − issues).
- **Delivery eligibility** — `deliverable` gate.

## Supported address kinds
Buyer · Seller · Store · Warehouse · Delivery (`AddressKind`).

## Exit criteria — met
All address kinds are normalized, parsed, validated, completed, de-duplicated and
scored for confidence + deliverability. Covered by 3 address tests.
