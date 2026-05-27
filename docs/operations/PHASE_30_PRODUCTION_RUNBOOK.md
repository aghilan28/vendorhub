# VendorHub Phase 30 Production Operations Runbook

## Release Gates

Every production promotion must pass:

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test`
5. `npm run ops:preflight`
6. `npm run build`
7. Staging smoke test with `VENDORHUB_BASE_URL=<staging-url> npm run ops:smoke`

The generated release artifacts live in `docs/operations/generated/`:

- `release-manifest.json`
- `backup-restore-plan.json`

## Environment Isolation

Production secrets only belong in the production provider environment. Local, development, preview, and staging must use isolated Supabase projects, storage buckets, telemetry scope, Razorpay test credentials, and non-production webhook secrets.

`config/environments.json` is the environment contract. A release is blocked if a target environment is missing Supabase project, storage bucket, telemetry, or Vercel target metadata.

## Migration Safety

Migrations are forward-only. For high-risk domains such as financial ledgers, settlement records, governance cases, disputes, realtime tables, and AI embeddings:

- validate in staging first
- take a pre-release snapshot
- generate the release manifest
- keep a compensating migration ready
- avoid destructive `drop table`, `drop column`, `truncate`, and broad `delete` operations
- verify RLS for every new sensitive table
- require explicit safety metadata for deterministic cleanup that matches destructive SQL patterns
- block broad `delete`, `truncate`, `drop table`, `drop column`, and enum value removal unless a reviewed compensating plan exists

Run:

```bash
npm run ops:migration-audit
```

The audit writes `docs/operations/generated/migration-safety-report.json`. The Phase 25 replay-key cleanup is allowed because it deletes only expired rows from `public.security_replay_keys` using `expires_at <= now()`. It is TTL metadata cleanup, not commerce, payment, ledger, seller, audit, or governance data mutation.

## Backup And Restore

Before production migrations:

1. Confirm Supabase PITR is enabled for production.
2. Generate backup plan: `npm run ops:backup-plan`.
3. Take a provider snapshot or logical dump.
4. Restore into staging.
5. Validate health, readiness, financial ledger integrity, governance counts, and RLS.

Backups are considered operational only after a restore drill succeeds.

Required restore evidence:

1. Snapshot or logical dump identifier.
2. Staging restore target.
3. Restore started and completed timestamps.
4. Critical table row-count comparison.
5. Ledger debit/credit balance result.
6. Settlement, governance, and dispute count comparison.
7. RLS smoke result on sensitive tables.
8. `/api/health`, `/api/readiness`, and smoke-test output.

## Rollback

Frontend rollback:

- Use Vercel previous deployment rollback.
- Run `/api/health` and `/api/readiness` after rollback.

Database rollback:

- Use forward-only compensating migrations.
- If corruption risk is present, stop writes with maintenance mode or feature flags, restore a verified snapshot into staging, and promote only after validation.

Feature rollback:

- Disable critical feature flags in `feature_flags`.
- Known critical flags are listed in `config/release-safety.json`.
- Use `maintenance_mode` for emergency write freeze when rollback requires data consistency review.
- Disable `atomic_checkout_rpc`, payment reconciliation, financial ledger, governance, AI, or realtime flags independently when isolating a dependency failure.

Rollback validation must capture rollback start time, completed time, operator, target deployment, smoke result, readiness result, and any follow-up compensating migration identifier.

## Degraded Mode

When a dependency is degraded:

- AI retrieval falls back to fuzzy/keyword ranking.
- Realtime clients recover through scoped subscriptions and snapshot refresh.
- Payments rely on webhook reconciliation.
- Payouts can be held through governance enforcement.
- Financial reconciliation and governance detection can be rerun after recovery.

## Incident Checks

Use:

- `/api/health`
- `/api/readiness`
- `/api/operations/health`
- `/api/operations/release`

Admin endpoints require admin or super-admin access.

## Alert Triggers

Page operators for failed deployment, failed rollback, migration corruption risk, backup inconsistency, restore mismatch, readiness degradation, and environment drift. Treat readiness degradation after a production promotion as a release incident until proven otherwise.

## Release Under Load

During seller or buyer traffic, release only after staging smoke passes and the release manifest is generated. Watch checkout failure rate, payment mismatch count, failed database reads/writes, realtime reconnects, delayed delivery count, and moderation backlog. If rollback starts while traffic is active, freeze risky writes with feature flags before database repair work.
