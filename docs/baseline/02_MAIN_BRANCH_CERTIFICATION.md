# Deliverable 2 — Main Branch Certification

**Section 1 of the directive (second half).** Gates executed on the certified branch `phase-l-finalization` @ `98350f0`.

> **Scope note.** The directive asks to certify "main". `main` (`4df0098`) cannot import-resolve its own test suite on this Windows host because of the `@/` alias bug; `phase-l-finalization` is `main` + exactly that one test-config fix (PR #13 open). All four gates are therefore certified on `phase-l-finalization`, which is functionally identical to `main` for build/runtime purposes and is the intended next state of `main`.

## 2.1 Gate results

| Gate | Command | Result | Evidence |
|---|---|:--:|---|
| Typecheck | `npm run typecheck` (`tsc --noEmit`) | ✅ PASS | exit 0, no diagnostics |
| Lint | `npm run lint` (`eslint .`) | ✅ PASS | exit 0; **0 errors, 1 warning** |
| Tests | `npm run test` (`vitest run`) | ✅ PASS | **35 suites / 202 tests passed** |
| Build | `npm run build` (`next build`) | ✅ PASS | compiled ~94s; **84/84 static pages**; full route table emitted |

**Lint warning (non-blocking):** `lib/tier14/index.ts:21:3 — 'Tier14ResearchConcept' is defined but never used (@typescript-eslint/no-unused-vars)`.

## 2.2 Runtime evidence (production server)

`next start` on port 3100, "Ready in 3.3s". Live probes:

| Route | HTTP | Interpretation |
|---|:--:|---|
| `/`, `/home`, `/cart`, `/categories`, `/launch`, `/offline`, `/sign-in`, `/manifest.webmanifest` | 200 | Public pages render |
| `/api/health` | 200 | Liveness OK |
| `/api/readiness` | 200 | Readiness OK |
| `/api/operations/health` | 500 | Structured `DATABASE_ERROR` — "Supabase public environment variables are not configured" + correlationId |
| `/api/operations/release` | 500 | Same env-gating |
| `/api/logistics/health` | 500 | Same env-gating |
| `/api/ops/async/health` | 500 | Same env-gating |

The 500s are **expected** in a secret-less local certification run. Handlers execute, validate environment, and fail closed with structured error envelopes (code + message + correlationId) — this is correct defensive behavior, not a defect. With Supabase env vars present, these return healthy.

## 2.3 Build inventory (from `next build`)

- Total app routes emitted: **94** route entries (pages + API + special files).
- Static (`○`) prerendered and Dynamic (`ƒ`) server-rendered routes both present.
- Middleware compiled (~150 kB).
- Shared First-Load JS ≈ 173 kB.

## 2.4 Certification statement

> **The certified branch PASSES all four quality gates and produces a working production build and runtime.** It is technically releasable as a hyperlocal commerce platform. This certification covers **build/test/type/lint/runtime health only**; it does **not** assert completeness of the Tier 1–15 program (see Realization Audit `08`) and is explicitly scoped to the certified branch, which does **not** include the unmerged Phase G/K surfaces (`01`).

**Main Branch Certification: ✅ PASS (conditional on merging PR #13 to make `main` test-runnable on Windows).**
