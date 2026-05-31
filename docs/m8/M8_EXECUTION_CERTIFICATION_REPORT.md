# M8.14 — Execution Certification Report

This report certifies the M8 execution platform against the mandatory validation
matrix. All results were produced on the M8 branch with dependencies installed.

---

## Validation matrix

| Validation | Method | Result |
|------------|--------|--------|
| **Typecheck** | `npx tsc --noEmit` (whole project) | ✅ Pass (0 errors) |
| **Lint** | `npm run lint` (`eslint .`) | ✅ Pass (0 errors; 1 pre-existing warning in `lib/tier14/index.ts`, unrelated to M8) |
| **Tests** | `npm run test` (vitest) | ✅ Pass — 230 tests across 36 files, incl. 28 new M8 tests |
| **Build** | `npm run build` (`next build`) | ✅ Pass — `/admin/execution` (static) and `/api/execution` (dynamic) emitted |
| **Runtime validation** | Store-driven workspace renders from `getExecutionState()`; no external service required | ✅ Functional offline |
| **Workflow validation** | `canTransition` / `transition` / `applyTransition` legality tests | ✅ Legal transitions accepted, illegal rejected without mutation |
| **Execution validation** | Create/assign/transition action plans & initiatives | ✅ Covered by mutation tests |
| **Outcome validation** | `applyRecordOutcome`, variance & success-rate analytics | ✅ Recompute verified |
| **User journey validation** | Journeys A/B/C wired to tested engine functions | ✅ See `M8_USER_JOURNEY_REPORT.md` |

## Commands (reproducible)

```bash
npm ci
npx tsc --noEmit          # typecheck
npm run lint              # eslint
npm run test              # vitest (230 tests)
npm run build             # next build
```

## Test coverage summary (`tests/unit/m8-execution.test.ts`)

- **Workflow engine:** seven-state lifecycle, legal/illegal transitions,
  audited events, transition-target validity.
- **Seed integrity:** determinism, non-empty dataset, referential integrity
  (initiative→program, action plan→initiative, owner links).
- **Factory & scoring:** action-plan defaults, KPI attainment by direction,
  outcome status thresholds, decision activation linkage.
- **Analytics snapshot:** bounded health score/tone, active counts, KPI/outcome
  percentage invariants, deterministic snapshot for fixed timestamps.
- **Mutations:** valid/invalid transitions, completion side-effects, action
  plan + initiative creation with parent linking, decision activation guards
  (approved → activated; pending and already-activated rejected), KPI
  measurement, outcome recording, escalation status + interventions, owner
  assignment validation.

## Note on `ops:preflight`

The repository's composite `validate` script also runs `ops:preflight`. Its
`ops:secret-scan` step fails on a **pre-existing** file
(`docs/tier12/RESEARCH_COMPENDIUM.md`) that predates and is unrelated to M8. No
M8 file contains secret-like content (verified). The four core engineering gates
relevant to M8 — typecheck, lint, test, build — all pass.

## Certification

The M8 execution platform is **certified** against the mandatory validation
matrix. Execution behaviour is deterministic, audited and fully tested.
