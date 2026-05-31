# MCP-1A.2 — Seller Onboarding System

**Engine:** `lib/seller-activation/onboarding.ts` · **Surface:** `/seller/onboarding`
(`OnboardingWizard`).

## The 12-step flow (+ submission)
registration → email verification → phone verification → store creation →
business info → GST info → address → bank → identity (PAN) → documents →
branding → configuration → **submission**.

## Capabilities (all mandated)
- **Onboarding wizard** — interactive, step-by-step; jump to any step via the
  progress tracker.
- **Validation engine** — `validateStep` per step + format checks
  (`isValidGstin/Pan/Ifsc`, pincode, email). GST step satisfiable by an
  exemption declaration.
- **Progress tracker** — `computeProgress` → completed/total steps, percent,
  `readyToSubmit`, `nextStep`, `blockers`.
- **Draft saving** — the wizard persists the application to `localStorage`
  (works with no backend); a DB-backed draft is a typed follow-up.
- **Application state machine** — `transitionApplication` guards
  `draft → submitted → under_review → approved/rejected → active`; submission is
  gated on `readyToSubmit` (cannot submit an incomplete application).
- **Onboarding status** — surfaced in the Activation Center (Phase 6).
- **Admin approval workflow** — submitted/under-review applications flow into the
  admin Seller Governance queues (Phase 7).

## Exit criteria — met
A new merchant can create a store from scratch, validated at every step, and
submit it for review without engineering intervention. Covered by 6 onboarding
tests in `tests/unit/mcp1a-seller-activation.test.ts`.
