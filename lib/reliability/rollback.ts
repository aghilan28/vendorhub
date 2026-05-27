export function rehearseRollback(input: {
  deploymentHealthy: boolean;
  migrationHealthy: boolean;
  smokePassed: boolean;
  backupVerified: boolean;
  reconciliationClean: boolean;
  estimatedMinutes: number;
}) {
  const blockers = [
    !input.backupVerified && "backup_not_verified",
    !input.smokePassed && "smoke_failed",
    !input.reconciliationClean && "reconciliation_not_clean",
    input.estimatedMinutes > 15 && "rollback_slo_breached",
  ].filter((item): item is string => Boolean(item));

  const rollbackRequired = !input.deploymentHealthy || !input.migrationHealthy || !input.smokePassed;
  return {
    rollbackRequired,
    safeToPromote: blockers.length === 0 && !rollbackRequired,
    blockers,
    action:
      blockers.length > 0
        ? "Keep deployment quarantined, preserve evidence, and complete backup/reconciliation smoke before promotion."
        : rollbackRequired
          ? "Execute rollback and run smoke, readiness, payment reconciliation, logistics reconciliation, and governance recovery."
          : "Rollback rehearsal passed within survivability guardrails.",
  };
}
