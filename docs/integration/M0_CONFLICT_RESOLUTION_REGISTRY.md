# M0 — Conflict Resolution Registry

Every merge conflict encountered during the A→L integration, with both sides, the final resolution, justification, risk, and rollback strategy. **No silent overwrites.** Of 13 merges, only the `stage-1` (I.5) merge produced conflicts; all other merges were clean (`ort` auto-merge), including K's touches to `lib/tier14/index.ts` and `lib/constants/*` (non-overlapping with stage-1's edits).

## Conflict set: merge I.5 — stage-1/production-readiness-remediation

### C1 — `package.json` (content conflict, `scripts` block)
- **Branch A (HEAD = A–I stack):** added `ops:consistency-check`, `ops:restore-drill`, `ops:rollback-plan`, `ops:model-registry-audit`, `reliability:chaos`, `reliability:certify`.
- **Branch B (stage-1):** added `ops:restore-drill`, `ops:audit`; `validate` script extended with `ops:audit`.
- **Final resolution:** **Union.** Kept all HEAD reliability/ops scripts AND stage-1's `ops:audit`. Single `ops:restore-drill` key (identical intent). `validate` retains `&& npm run ops:audit &&` from stage-1.
- **Justification:** Both sets are additive, non-overlapping in purpose; dropping either would strand reliability tooling (D) or the security-audit gate (stage-1).
- **Risk:** Low. Verified valid JSON; `npm install` reconciled lockfile with 0 vulnerabilities.
- **Rollback:** `git checkout origin/stage-1/production-readiness-remediation -- package.json` (or revert merge commit `379c420`).

### C2 — `scripts/ops-restore-drill.mjs` (add/add conflict)
- **Branch A (HEAD, from D-stack):** 58-line version.
- **Branch B (stage-1):** 154-line version (more complete restore-drill implementation).
- **Final resolution:** **Took stage-1 version** (`git checkout --theirs`).
- **Justification:** stage-1 is the production-readiness-remediation branch whose explicit purpose is hardening ops scripts; its restore-drill is a strict superset in behavior. The D-stack version was an earlier scaffold.
- **Risk:** Low. Script is an ops utility (not in build/test path); `npm run typecheck`/`build` unaffected.
- **Rollback:** `git checkout <D-stack sha>:scripts/ops-restore-drill.mjs` if the leaner version is preferred.

### C3 — `docs/operations/generated/restore-drill-report.json` (add/add conflict)
- **Branch A (HEAD):** 35-line generated report.
- **Branch B (stage-1):** 53-line generated report.
- **Final resolution:** **Took stage-1 version** (`git checkout --theirs`).
- **Justification:** Generated artifact paired with C2; kept consistent with the chosen script. Non-functional (documentation output).
- **Risk:** None. Regenerable via `npm run ops:restore-drill`.
- **Rollback:** regenerate, or checkout the HEAD version.

## Auto-resolved (no manual intervention, recorded for completeness)

| File | Branches | How resolved |
|---|---|---|
| `lib/tier14/index.ts` | stage-1, K (and L lineage) | `ort` auto-merge — stage-1 and K edited different regions; union preserved. Verified by typecheck. |
| `lib/constants/navigation.ts`, `marketplace.ts` | K vs base | clean (K-only changes over base) |
| `docs/phase-h/...AUDIT.md` | H then I | I's copy identical to H's already-merged copy → no conflict |
| `.env.example` | B vs base | clean union |
| `vitest.config.ts` | L vs base | clean (L-only change) |

## Summary
- **Total conflicts:** 3 (all in merge I.5). **Manual resolutions:** 3. **Silent overwrites:** 0.
- **Post-resolution gates:** typecheck ✅, lint ✅, test ✅ (268), build ✅.
