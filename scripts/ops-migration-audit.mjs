import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationDir = path.join(root, "supabase", "migrations");
const migrations = fs.readdirSync(migrationDir).filter((file) => file.endsWith(".sql")).sort();
const releaseSafety = JSON.parse(fs.readFileSync(path.join(root, "config", "release-safety.json"), "utf8"));
const allowlistedCleanups = releaseSafety.migrationSafety?.allowedDestructiveCleanups ?? [];
const destructivePatterns = [
  { kind: "drop table", pattern: /\bdrop\s+table\b/i, risk: "critical" },
  { kind: "drop column", pattern: /\bdrop\s+column\b/i, risk: "critical" },
  { kind: "truncate table", pattern: /\btruncate\s+table\b/i, risk: "critical" },
  { kind: "delete", pattern: /\bdelete\s+from\b/i, risk: "high" },
  { kind: "alter type drop value", pattern: /\balter\s+type\b.+\bdrop\s+value\b/i, risk: "high" },
];
const requiredSafetyPatterns = [/if\s+not\s+exists/i, /on\s+conflict/i, /create\s+or\s+replace/i, /drop\s+trigger\s+if\s+exists/i];

const findings = [];
const destructiveOperations = [];

function normalizeSql(value) {
  return value
    .replace(/--.*$/gm, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/;$/, "")
    .trim();
}

function lineFor(sql, index) {
  return sql.slice(0, index).split(/\r?\n/).length;
}

function statementAt(sql, index) {
  const end = sql.indexOf(";", index);
  return sql.slice(index, end === -1 ? undefined : end + 1).trim();
}

function annotationFor(sql, index) {
  const before = sql.slice(0, index).split(/\r?\n/).slice(-4).join("\n");
  return before.match(/vendorhub-migration-safety:\s+allow-destructive-cleanup\s+id=([a-z0-9_-]+)\s+risk=([a-z]+)\s+rollback=([a-z_]+)/i);
}

function cleanupMatches(statement, cleanup) {
  const normalized = normalizeSql(statement);
  return normalized.includes(`${cleanup.operation} from ${cleanup.table}`.toLowerCase()) && normalized.includes(`where ${cleanup.where}`.toLowerCase());
}

for (const file of migrations) {
  const sql = fs.readFileSync(path.join(migrationDir, file), "utf8");
  for (const destructive of destructivePatterns) {
    const flags = destructive.pattern.flags.includes("g") ? destructive.pattern.flags : `${destructive.pattern.flags}g`;
    for (const match of sql.matchAll(new RegExp(destructive.pattern.source, flags))) {
      const index = match.index ?? 0;
      const statement = statementAt(sql, index);
      const annotation = annotationFor(sql, index);
      const cleanup = annotation ? allowlistedCleanups.find((item) => item.id === annotation[1] && item.file === file) : undefined;
      const allowed = Boolean(cleanup && cleanup.risk === annotation?.[2] && cleanup.rollback === annotation?.[3] && cleanupMatches(statement, cleanup));
      const operation = {
        file,
        line: lineFor(sql, index),
        kind: destructive.kind,
        risk: allowed ? cleanup.risk : destructive.risk,
        rollback: allowed ? cleanup.rollback : "required",
        allowed,
        annotationId: annotation?.[1] ?? null,
        statement: normalizeSql(statement),
        reason: cleanup?.reason ?? null,
      };
      destructiveOperations.push(operation);

      if (!allowed) {
        findings.push({
          file,
          severity: "critical",
          message: `Unapproved destructive operation at line ${operation.line}: ${destructive.kind}. Add explicit safety metadata only for deterministic cleanup, otherwise provide a compensating migration plan.`,
        });
      }
    }
  }

  const createsObjects = /\bcreate\s+(table|type|index|policy|function|trigger)\b/i.test(sql);
  const hasSafety = requiredSafetyPatterns.some((pattern) => pattern.test(sql));
  if (createsObjects && !hasSafety) {
    findings.push({ file, severity: "warning", message: "Migration creates objects but has no obvious idempotency/safety clause." });
  }

  if (/financial_ledger|settlement_records|governance_cases|marketplace_disputes/i.test(sql) && !/enable\s+row\s+level\s+security/i.test(sql)) {
    findings.push({ file, severity: "critical", message: "Critical operational table migration missing RLS enablement." });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  migrationsAudited: migrations.length,
  strict: true,
  destructiveOperations,
  findings,
  summary: {
    approvedDestructiveCleanups: destructiveOperations.filter((operation) => operation.allowed).length,
    blockedDestructiveOperations: destructiveOperations.filter((operation) => !operation.allowed).length,
    warnings: findings.filter((finding) => finding.severity === "warning").length,
    critical: findings.filter((finding) => finding.severity === "critical").length,
  },
};

const reportPath = path.join(root, releaseSafety.migrationSafety?.reportPath ?? "docs/operations/generated/migration-safety-report.json");
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

const critical = findings.filter((finding) => finding.severity === "critical");
if (critical.length) {
  console.error("Migration audit failed.");
  for (const finding of findings) console.error(`${finding.severity.toUpperCase()} ${finding.file}: ${finding.message}`);
  process.exit(1);
}

for (const finding of findings) console.warn(`${finding.severity.toUpperCase()} ${finding.file}: ${finding.message}`);
console.log(`Migration audit passed for ${migrations.length} migrations. Report written to ${path.relative(root, reportPath)}.`);
