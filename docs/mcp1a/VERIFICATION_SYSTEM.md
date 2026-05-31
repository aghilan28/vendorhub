# MCP-1A.3 — KYC & Verification System

**Engine:** `lib/seller-activation/verification.ts`.

## Capabilities (all mandated)
- **Identity verification** — PAN format + presence.
- **Business verification** — business name/type + GSTIN validity, with a
  **GSTIN↔PAN consistency** check (PAN is embedded in chars 3–12 of a GSTIN).
- **Bank verification** — IFSC + account-number shape + holder presence.
- **Document verification** — required KYC documents (PAN, bank proof) present;
  partial sets → manual review.
- **Risk flags** — `missing_gstin`, `invalid_gstin/pan/ifsc`, `name_mismatch`
  (bank holder vs business/owner), `incomplete_documents`.
- **Fraud checks** — name-mismatch + format-integrity heuristics feed the score.
- **Risk score** — 0–100 from failures/manual/pending checks + weighted flags.
- **Decision + approval workflow** — `auto_approve` / `manual_review` / `reject`.
- **Escalation** — manual-review cases with risk ≥ 50 are `escalated` → admin
  escalation queue.
- **Trust score integration** — `trustContribution` (0–100) feeds the seller
  trust score consumed by the Activation Center and storefront.
- **Audit trail** — verification is derived deterministically from the audited
  application; admin queues record the case.

## Exit criteria — met
The marketplace can verify merchants: complete, consistent applications
auto-approve; risky/incomplete ones route to manual review or rejection with
explicit flags. Covered by 3 verification tests.
