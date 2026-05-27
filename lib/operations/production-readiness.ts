import environments from "@/config/environments.json";
import releaseSafety from "@/config/release-safety.json";
import { getEnvironmentReadiness } from "@/lib/env";

export type DeploymentEnvironment = keyof typeof environments;

export function currentDeploymentEnvironment(): DeploymentEnvironment {
  const value = process.env.VENDORHUB_ENVIRONMENT ?? process.env.VERCEL_ENV ?? "local";
  if (value === "production") return "production";
  if (value === "preview") return "staging";
  if (value === "development") return "development";
  if (value in environments) return value as DeploymentEnvironment;
  return "local";
}

export function getProductionOperationsReadiness() {
  const environment = currentDeploymentEnvironment();
  const envConfig = environments[environment];
  const envReadiness = getEnvironmentReadiness();
  const gitSha = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? "local";
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID ?? "local";
  const productionTarget = environment === "production";
  const publicMissing = envReadiness.missingRequired.length;
  const privateChecks = envReadiness.checks.filter((item) => !item.public);
  const privateMissing = privateChecks.filter((item) => !item.configured).map((item) => item.key);
  const productionSecretsAllowed = releaseSafety.environmentGovernance.productionSecretsAllowedOnlyIn.includes(environment);
  const productionReady = productionTarget ? publicMissing === 0 && privateMissing.length === 0 : publicMissing === 0;

  return {
    environment,
    generatedAt: new Date().toISOString(),
    deployment: {
      gitSha,
      deploymentId,
      vercelTarget: envConfig.vercelTarget,
      reversible: true,
      rollbackTarget: releaseSafety.rollbackTargets.frontend,
    },
    isolation: {
      supabaseProjectRef: envConfig.supabaseProjectRef,
      telemetryScope: envConfig.telemetryScope,
      storageBuckets: envConfig.storageBuckets,
      allowsProductionSecrets: envConfig.allowsProductionSecrets,
    },
    gates: {
      mode: envReadiness.mode,
      productionReady,
      missingPublic: envReadiness.missingRequired,
      missingPrivate: privateMissing,
      requiredChecks: releaseSafety.requiredChecks,
    },
    rollback: {
      targets: releaseSafety.rollbackTargets,
      deterministic: true,
      frontendSmokeRequired: releaseSafety.deploymentVerification.rollbackSmokeRequired,
      databaseStrategy: "forward-only-compensating-migration",
      readinessVisible: true,
    },
    deploymentVerification: {
      smokeEndpoints: releaseSafety.deploymentVerification.smokeEndpoints,
      maxHealthLatencyMs: releaseSafety.deploymentVerification.maxHealthLatencyMs,
      maxReadinessLatencyMs: releaseSafety.deploymentVerification.maxReadinessLatencyMs,
      stagingBeforeProduction: releaseSafety.deploymentVerification.stagingBeforeProduction,
    },
    migrationSafety: {
      strict: true,
      reportPath: releaseSafety.migrationSafety.reportPath,
      blockedOperations: releaseSafety.migrationSafety.blockedOperations,
      allowedDestructiveCleanups: releaseSafety.migrationSafety.allowedDestructiveCleanups.map((item) => ({
        id: item.id,
        file: item.file,
        operation: item.operation,
        table: item.table,
        risk: item.risk,
        rollback: item.rollback,
      })),
      rollbackRequiredForRisk: releaseSafety.migrationSafety.rollbackRequiredForRisk,
    },
    criticalFeatureFlags: releaseSafety.criticalFeatureFlags,
    featureKillSwitches: releaseSafety.featureKillSwitches,
    criticalTables: releaseSafety.criticalTables,
    backup: {
      requiredBeforeProductionMigration: releaseSafety.backupRestore.requiredBeforeProductionMigration,
      restoreDrillRequired: releaseSafety.backupRestore.restoreDrillRequired,
      maxRestoreDrillAgeHours: releaseSafety.backupRestore.maxRestoreDrillAgeHours,
      integrityChecks: releaseSafety.backupRestore.integrityChecks,
      protectedDatasets: releaseSafety.criticalTables,
    },
    environmentGovernance: {
      isolated: releaseSafety.environmentGovernance.isolatedEnvironments.includes(environment),
      productionSecretsAllowed,
      allowsProductionSecrets: envConfig.allowsProductionSecrets,
      driftRisk: envConfig.allowsProductionSecrets !== productionSecretsAllowed ? "configuration-mismatch" : "none",
    },
    observability: {
      tracked: releaseSafety.observability.track,
      alertOn: releaseSafety.observability.alertOn,
      readinessStatus: productionReady ? "ready" : "blocked",
    },
  };
}
