# VendorHub Disaster Recovery Playbook

## DB Corruption

1. Disable risky write paths with feature flags.
2. Pause payout creation and financial settlement release.
3. Export current incident evidence: health snapshot, release manifest, migration hash list.
4. Restore the latest verified backup into staging.
5. Run migration chain and health checks.
6. Compare critical table counts: orders, payment attempts, ledger journals, settlement records, governance cases, disputes.
7. Promote restored database only after finance and governance consistency checks pass.

Dependency order: identity and database first, storage second, payments third, realtime projections fourth, AI indexing last. Never promote a restored database until payment reconciliation and ledger balance checks agree.

## Failed Deployment

1. Roll back to previous Vercel deployment.
2. Run `npm run ops:smoke` against production URL.
3. Review `/api/operations/release`.
4. Keep the failed deployment quarantined until root cause is documented.

## Migration Failure

1. Stop additional migration attempts.
2. Confirm whether migration partially applied.
3. Use compensating migration rather than destructive rollback.
4. If financial/governance tables are affected, run reconciliation and governance detection after repair.
5. If partial writes affected active checkout, enable maintenance mode, preserve evidence, and replay reconciliation only after database consistency is verified.

## Supabase Outage

1. Keep frontend in degraded state.
2. Prevent checkout submission if database writes are unavailable.
3. Do not execute payouts or refunds manually without reconciliation record.
4. Resume by running health, readiness, financial reconciliation, and governance detection.
5. Keep realtime disabled until database reads and writes are stable; realtime is a projection, not the source of truth.

## Payment Outage

1. Disable live provider initiation if provider cannot accept requests.
2. Keep existing payment attempts in reconciling state.
3. Replay webhook reconciliation after provider recovery.
4. Do not mark paid from frontend redirect state.
5. Hold payouts for affected settlement windows until reconciliation and dispute windows are reviewed.

## Realtime Failure

1. Treat realtime as a projection layer only.
2. Fall back to query invalidation and snapshot refresh.
3. Verify event drift through order, payout, delivery, and governance tables.

## Storage Corruption

1. Block public access to affected bucket paths.
2. Restore from provider object versioning or snapshot.
3. Verify product images, KYC documents, and dispute evidence separately.
4. Never expose raw private evidence while validating recovery.

## Emergency Maintenance Mode

Use maintenance mode when writes could make recovery harder: suspected database corruption, unsafe migration state, payment provider mismatch, or backup restore mismatch. Keep read-only surfaces available where possible, post operator-facing incident context, and restore write paths one domain at a time after smoke checks pass.

## Escalation

Escalate immediately when rollback smoke fails, restore validation mismatches, payment reconciliation disagrees with ledger state, or environment drift is detected. The incident owner must attach release manifest, migration safety report, backup restore evidence, and health/readiness snapshots before declaring recovery.
