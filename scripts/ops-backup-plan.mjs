import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const releaseSafety = JSON.parse(fs.readFileSync(path.join(root, "config", "release-safety.json"), "utf8"));
const backupPlan = {
  generatedAt: new Date().toISOString(),
  strategy: "Supabase managed PITR plus explicit pre-release logical snapshot",
  rehearsalEnvironment: releaseSafety.backupRestore.rehearsalEnvironment,
  requiredBeforeProductionMigration: releaseSafety.backupRestore.requiredBeforeProductionMigration,
  retention: {
    preReleaseSnapshots: "14 days",
    weeklyRestoreDrills: "last 4 successful drills",
    operationalManifests: "180 days",
  },
  protectedDatasets: releaseSafety.criticalTables,
  integrityVerification: releaseSafety.backupRestore.integrityChecks,
  restoreValidation: [
    "Restore snapshot into isolated staging Supabase project.",
    "Run migration chain against restored database.",
    "Validate financial ledger journal balance and settlement counts.",
    "Validate governance case/dispute counts and RLS access.",
    "Run /api/readiness and /api/health against staging deployment.",
  ],
  restoreSimulation: {
    status: "metadata-ready",
    validBackupRequiresRestoreDrill: true,
    maxRestoreDrillAgeHours: releaseSafety.backupRestore.maxRestoreDrillAgeHours,
    expectedEvidence: [
      "snapshot identifier",
      "restore target project",
      "started_at and completed_at timestamps",
      "critical table row count comparison",
      "ledger balance result",
      "RLS validation result",
      "health and readiness smoke output",
    ],
  },
  failureHandling: {
    backupInconsistency: "Block production migration, keep current production online, create fresh snapshot, and rerun restore rehearsal.",
    restoreMismatch: "Escalate incident, freeze writes with maintenance mode or kill switches, and compare release manifest migration hashes before promotion.",
  },
  checksum: crypto.createHash("sha256").update(JSON.stringify(releaseSafety.criticalTables)).digest("hex"),
};

const outDir = path.join(root, "docs", "operations", "generated");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "backup-restore-plan.json");
fs.writeFileSync(outFile, JSON.stringify(backupPlan, null, 2));
console.log(`Backup and restore plan written to ${path.relative(root, outFile)}.`);
