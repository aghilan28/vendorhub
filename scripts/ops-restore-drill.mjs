#!/usr/bin/env node
/**
 * KARTEX Phase D — restore-drill verifier.
 *
 * Asserts the backup/restore drill posture from config/release-safety.json:
 * drill recency (maxRestoreDrillAgeHours), required integrity checks, and the
 * rehearsal environment. Records the drill timestamp via LAST_RESTORE_DRILL_AT
 * (ISO) when a real drill runs in staging. Emits a checklist + status.
 *
 *   node scripts/ops-restore-drill.mjs            # report
 *   node scripts/ops-restore-drill.mjs --enforce  # non-zero exit if drill stale
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const OUT = "docs/operations/generated/restore-drill-report.json";
const enforce = process.argv.includes("--enforce");
const safety = JSON.parse(readFileSync("config/release-safety.json", "utf8"));
const br = safety.backupRestore ?? {};

const maxAgeHours = br.maxRestoreDrillAgeHours ?? 168;
const lastDrillAt = process.env.LAST_RESTORE_DRILL_AT ? new Date(process.env.LAST_RESTORE_DRILL_AT) : null;
const ageHours = lastDrillAt ? (Date.now() - lastDrillAt.getTime()) / 3.6e6 : null;
const stale = ageHours == null || ageHours > maxAgeHours;

const report = {
  generatedAt: new Date().toISOString(),
  rehearsalEnvironment: br.rehearsalEnvironment ?? "staging",
  requiredBeforeProductionMigration: br.requiredBeforeProductionMigration ?? true,
  restoreDrillRequired: br.restoreDrillRequired ?? true,
  maxRestoreDrillAgeHours: maxAgeHours,
  lastRestoreDrillAt: lastDrillAt ? lastDrillAt.toISOString() : null,
  drillAgeHours: ageHours == null ? null : Math.round(ageHours),
  stale,
  integrityChecks: br.integrityChecks ?? [],
  // Per-runtime restore procedure (RPO/RTO source: config/slo.json).
  procedures: {
    database: "Supabase PITR / snapshot restore into staging; then run integrity checks + ops:consistency-check --enforce",
    redis: "Restore AOF/RDB or re-warm from source of truth; cache loss tolerated (degrade-safe)",
    kafka: "Replay from offset/timestamp into rebuilt topics (register-topics.sh)",
    neo4j: "Restore Aura backup OR rebuild projection by replaying kartex.knowledge.graph.mutations",
    qdrant: "Restore snapshot OR reindex from catalog (register-collections.sh + embedding pipeline)",
    flink: "Restore from latest savepoint; resume from last checkpoint",
    config: "Re-apply config/* + environment secrets from secret store",
    secrets: "Rotate + re-inject from secret store (no secrets in repo)"
  },
  verification: [
    "critical table row-count comparison vs pre-restore baseline",
    "financial ledger debit/credit balance validation",
    "RLS smoke validation on sensitive tables",
    "/api/health + /api/readiness + /api/runtime/health smoke"
  ],
  status: stale ? "ACTION_REQUIRED" : "OK"
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

if (enforce && stale) {
  console.error(`Restore drill stale (age=${report.drillAgeHours ?? "never"}h > ${maxAgeHours}h). Run a staging restore drill and set LAST_RESTORE_DRILL_AT.`);
  process.exit(1);
}
