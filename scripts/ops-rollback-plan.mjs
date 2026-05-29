#!/usr/bin/env node
/**
 * KARTEX Phase D — rollback plan generator.
 *
 * Builds a per-surface rollback plan from config/release-safety.json: app,
 * database (forward-only compensating migrations), configuration, feature flags
 * (+ kill switches), schema, and provider. Each surface gets steps + a
 * verification gate. Emits docs/operations/generated/rollback-plan.json.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const OUT = "docs/operations/generated/rollback-plan.json";
const safety = JSON.parse(readFileSync("config/release-safety.json", "utf8"));
const smoke = safety.deploymentVerification?.smokeEndpoints ?? ["/api/health", "/api/readiness"];

const surfaces = [
  {
    surface: "application", trigger: "elevated 5xx / SLO fast burn after deploy",
    steps: [safety.rollbackTargets?.frontend ?? "promote previous Vercel production deployment"],
    verification: smoke, reversible: true, estMinutes: 5,
  },
  {
    surface: "database", trigger: "migration corruption risk / data anomaly",
    steps: [
      safety.rollbackTargets?.database ?? "forward-only compensating migration",
      "destructive ops are blocked: " + (safety.migrationSafety?.blockedOperations ?? []).join(", "),
      "if data loss suspected: restore drill path (ops:restore-drill) before any write resumes",
    ],
    verification: ["ops:consistency-check --enforce", "ledger balance validation"], reversible: false, estMinutes: 30,
  },
  {
    surface: "configuration", trigger: "config drift / bad config rollout",
    steps: [safety.rollbackTargets?.realtime ?? "revert config/*", "re-apply previous environment config"],
    verification: smoke, reversible: true, estMinutes: 5,
  },
  {
    surface: "feature_flags", trigger: "feature regression",
    steps: [
      "disable via kill switch (Supabase feature_flags)",
      "kill switches: " + Object.entries(safety.featureKillSwitches ?? {}).map(([k, v]) => `${k}=${v}`).join(", "),
    ],
    verification: ["confirm flag state", "smoke affected workflow"], reversible: true, estMinutes: 1,
  },
  {
    surface: "schema", trigger: "incompatible schema change",
    steps: ["expand/contract: keep backward-compatible columns; never drop in same release", "deploy compensating migration"],
    verification: ["ops:migration-audit", "ops:consistency-check"], reversible: false, estMinutes: 30,
  },
  {
    surface: "provider", trigger: "provider integration failure (Razorpay/Shiprocket/web-push)",
    steps: [
      safety.rollbackTargets?.ai ?? "switch to degraded fallback",
      "Razorpay: pause new captures, reconcile via webhook_ingestions",
      "Shiprocket: switch to self-delivery mode",
    ],
    verification: ["reconciliation run", "no orphan payments"], reversible: true, estMinutes: 10,
  },
];

const report = {
  generatedAt: new Date().toISOString(),
  criticalFeatureFlags: safety.criticalFeatureFlags ?? [],
  criticalTables: safety.criticalTables ?? [],
  rollbackSmokeRequired: safety.deploymentVerification?.rollbackSmokeRequired ?? true,
  surfaces,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
