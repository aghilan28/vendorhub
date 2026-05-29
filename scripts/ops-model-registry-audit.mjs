#!/usr/bin/env node
/**
 * KARTEX Phase E — model registry governance gate.
 *
 * Asserts: no asset reaches `production` without owner + evaluation metrics +
 * version + lineage + risk; valid lifecycle states; no orphan intelligence.
 * Emits docs/operations/generated/model-registry-audit.json.
 *
 *   node scripts/ops-model-registry-audit.mjs            # report
 *   node scripts/ops-model-registry-audit.mjs --enforce  # non-zero exit on violation
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const OUT = "docs/operations/generated/model-registry-audit.json";
const enforce = process.argv.includes("--enforce");
const STATES = ["development", "candidate", "staging", "production", "retired"];
const RISKS = ["low", "medium", "high", "critical"];

const registry = JSON.parse(readFileSync("config/model-registry.json", "utf8"));
const models = registry.models ?? [];
const violations = [];

for (const m of models) {
  if (!m.owner) violations.push({ model: m.key, rule: "owner_required", detail: "no orphan intelligence" });
  if (!m.version) violations.push({ model: m.key, rule: "version_required", detail: "missing version" });
  if (!STATES.includes(m.state)) violations.push({ model: m.key, rule: "valid_state", detail: `invalid state ${m.state}` });
  if (m.state === "production") {
    if (!(m.evaluation?.metrics?.length > 0)) violations.push({ model: m.key, rule: "eval_required_for_prod", detail: "no evaluation metrics" });
    if (!(m.lineage?.consumes && m.lineage?.produces)) violations.push({ model: m.key, rule: "lineage_required_for_prod", detail: "no lineage" });
    if (!RISKS.includes(m.risk)) violations.push({ model: m.key, rule: "risk_required_for_prod", detail: "no risk level" });
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  total: models.length,
  byState: models.reduce((a, m) => ((a[m.state] = (a[m.state] ?? 0) + 1), a), {}),
  byRisk: models.reduce((a, m) => ((a[m.risk] = (a[m.risk] ?? 0) + 1), a), {}),
  unevaluatedProduction: models.filter((m) => m.state === "production" && !m.evaluation?.lastEvaluatedAt).map((m) => m.key),
  highRiskProduction: models.filter((m) => m.state === "production" && (m.risk === "high" || m.risk === "critical")).map((m) => m.key),
  violations,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));

if (enforce && violations.length > 0) {
  console.error(`Model registry governance: ${violations.length} violation(s).`);
  process.exit(1);
}
