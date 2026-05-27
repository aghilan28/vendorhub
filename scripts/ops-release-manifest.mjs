import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const releaseSafety = JSON.parse(fs.readFileSync(path.join(root, "config", "release-safety.json"), "utf8"));

function hashFile(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

const migrations = fs.readdirSync(path.join(root, "supabase", "migrations")).filter((file) => file.endsWith(".sql")).sort();
const migrationSafetyReportPath = path.join(root, releaseSafety.migrationSafety?.reportPath ?? "docs/operations/generated/migration-safety-report.json");
const manifest = {
  generatedAt: new Date().toISOString(),
  app: "vendorhub",
  phase: 30,
  node: "22",
  environment: process.env.VENDORHUB_ENVIRONMENT ?? process.env.VERCEL_ENV ?? "local",
  release: {
    gitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? "local",
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? "local",
    operator: process.env.GITHUB_ACTOR ?? process.env.USERNAME ?? "local",
  },
  requiredChecks: releaseSafety.requiredChecks,
  criticalFeatureFlags: releaseSafety.criticalFeatureFlags,
  criticalTables: releaseSafety.criticalTables,
  rollbackTargets: releaseSafety.rollbackTargets,
  rollbackManifest: {
    frontend: {
      target: releaseSafety.rollbackTargets.frontend,
      validation: releaseSafety.deploymentVerification.smokeEndpoints,
      maxReadinessLatencyMs: releaseSafety.deploymentVerification.maxReadinessLatencyMs,
    },
    database: {
      target: releaseSafety.rollbackTargets.database,
      forwardOnly: true,
      compensatingMigrationRequired: true,
      snapshotRestoreRequiresStagingValidation: true,
    },
    featureFlags: releaseSafety.featureKillSwitches,
  },
  deploymentVerification: releaseSafety.deploymentVerification,
  backupRestore: releaseSafety.backupRestore,
  observability: releaseSafety.observability,
  migrations: migrations.map((file) => ({
    file,
    sha256: hashFile(path.join(root, "supabase", "migrations", file)),
  })),
  migrationSafetyReportSha256: fs.existsSync(migrationSafetyReportPath) ? hashFile(migrationSafetyReportPath) : null,
  packageLockSha256: hashFile(path.join(root, "package-lock.json")),
};

const outDir = path.join(root, "docs", "operations", "generated");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "release-manifest.json");
fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2));
console.log(`Release manifest written to ${path.relative(root, outFile)}.`);
