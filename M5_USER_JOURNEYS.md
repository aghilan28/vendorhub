# M5.14 — Mandatory User Journeys Report

Phase: KARTEX M5 — Governance Operating System

All five mandatory journeys function end to end against real, persisted state.

## Journey A — Create policy → review → approve → publish

1. **Create** a policy in the Policy Management Center (`/governance/policies` →
   "New policy"): title, category, rules, applicable systems, owner/reviewers/
   approvers, controls.
2. **Review** — on the policy detail page, move `draft → review`.
3. **Approve** — an approver moves `review → approved` (gated by `policy.approve`).
4. **Publish** — move `approved → published`; the effective date is stamped and
   the action is audited.

## Journey B — Create decision → assign reviewer → approve → track outcome

1. **Create** a decision in the Decision Center, choosing a source system
   (e.g. SECIS) and assigning reviewers/approvers.
2. **Assign reviewer** — the create form (and detail page) assign reviewers; the
   governance-readiness panel confirms the reviewer requirement is met.
3. **Approve** — an approver records an approval; once the required approvals are
   met the decision auto-advances to `approved`.
4. **Track outcome** — record the realised outcome (adopted / deferred / …) on
   the decision detail; every step is in the audit trail.

## Journey C — Open Audit Center → review changes → view timeline → export

1. **Open** the Audit Center (`/governance/audit`).
2. **Review changes** — each record shows who / what / when / why, including
   field-level changes for transitions.
3. **View timeline** — the visual, filterable timeline orders all governance
   activity.
4. **Export** — "Export" downloads the (filtered) audit trail as JSON; the
   Reporting center additionally exports CSV.

## Journey D — Open Risk Registry → review risk → assign mitigation → track resolution

1. **Open** the Risk Governance Center (`/governance/risks`).
2. **Review risk** — inspect severity, likelihood, computed score, owner, and
   history.
3. **Assign mitigation** — add a mitigation plan; the risk moves to `mitigating`.
4. **Track resolution** — change the status to `resolved`; each change appends to
   the risk history and the audit trail.

## Journey E — Request exception → review → approve → archive

1. **Request** an exception in Exception Management (`/governance/exceptions`),
   selecting the policy and expiry.
2. **Review** — move the request to `review`.
3. **Approve** — record an approval (moves to `approved` with an expiry).
4. **Archive** — once expired or no longer needed, archive it. All steps audited.

## Verification

- `next build` compiles all journey routes.
- `tests/unit/governance-os.test.ts` validates risk scoring, compliance,
  decision evaluation, workflow transitions, recommendations, reports, and RBAC.
- The persisted store guarantees work created in any journey survives reloads and
  is visible across every screen.
