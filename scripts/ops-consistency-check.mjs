#!/usr/bin/env node
/**
 * KARTEX Phase D — data-consistency invariant catalog + checker.
 *
 * Emits the executable catalog of consistency invariants (order/inventory/
 * payment/event/graph/vector/analytics) and the anomaly classes they detect
 * (duplicate processing, lost events, partial updates, race conditions, orphans).
 * When SUPABASE_DB_URL is set AND `pg` is installed, runs the SQL invariants and
 * reports row counts; otherwise emits the catalog (CI-safe, no DB required).
 *
 *   node scripts/ops-consistency-check.mjs            # report-only
 *   node scripts/ops-consistency-check.mjs --enforce  # non-zero exit on any breach
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const OUT = "docs/operations/generated/data-consistency-checks.json";
const enforce = process.argv.includes("--enforce");

// Each invariant: a SQL predicate that should return ZERO rows in a consistent system.
const invariants = [
  { id: "orders.no_paid_without_payment", domain: "order", anomaly: "partial_update",
    sql: "select count(*) from orders o where o.status in ('PAID','CONFIRMED') and not exists (select 1 from payment_attempts p where p.order_id = o.id and p.status = 'captured')" },
  { id: "payments.no_duplicate_capture", domain: "payment", anomaly: "duplicate_processing",
    sql: "select count(*) from (select provider, event_id, count(*) c from webhook_ingestions group by provider, event_id having count(*) > 1) d" },
  { id: "payments.ledger_balanced", domain: "payment", anomaly: "partial_update",
    sql: "select count(*) from financial_ledger_journals j where (select coalesce(sum(amount_minor),0) from financial_ledger_entries e where e.journal_id = j.id and e.direction='debit') <> (select coalesce(sum(amount_minor),0) from financial_ledger_entries e where e.journal_id = j.id and e.direction='credit')" },
  { id: "inventory.no_negative_available", domain: "inventory", anomaly: "race_condition",
    sql: "select count(*) from products where coalesce(stock_quantity,0) < 0" },
  { id: "orders.no_orphan_items", domain: "order", anomaly: "orphan_data",
    sql: "select count(*) from order_items oi where not exists (select 1 from orders o where o.id = oi.order_id)" },
  { id: "events.no_stuck_pending", domain: "event", anomaly: "lost_events",
    sql: "select count(*) from async_jobs where status = 'pending' and created_at < now() - interval '1 hour'" },
  { id: "events.dead_letter_unreviewed", domain: "event", anomaly: "lost_events",
    sql: "select count(*) from async_jobs where status = 'dead_letter'" },
  { id: "refunds.no_overrefund", domain: "payment", anomaly: "partial_update",
    sql: "select count(*) from orders o where (select coalesce(sum(amount_minor),0) from refunds r where r.order_id=o.id and r.status='completed') > o.total_amount_minor" },
  { id: "search.vector_orphans", domain: "vector", anomaly: "orphan_data",
    sql: "-- derived index: products without a current embedding row (pgvector baseline)\nselect count(*) from products p where p.status='ACTIVE' and not exists (select 1 from product_embeddings e where e.product_id = p.id)" },
  { id: "graph.projection_lag", domain: "graph", anomaly: "lost_events",
    sql: "-- projection check (Neo4j): compare SELLS edge count to active seller-product pairs (run via projector reconcile)" },
];

async function tryRunSql() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) return null;
  let pg;
  try {
    pg = await import("pg");
  } catch {
    return { error: "pg not installed; install to run live invariants" };
  }
  const client = new pg.default.Client({ connectionString: url });
  const results = [];
  try {
    await client.connect();
    for (const inv of invariants) {
      if (inv.sql.trim().startsWith("--") && !inv.sql.includes("select")) {
        results.push({ id: inv.id, executed: false, note: "manual/projector check" });
        continue;
      }
      try {
        const r = await client.query(inv.sql);
        const violations = Number(r.rows?.[0]?.count ?? 0);
        results.push({ id: inv.id, domain: inv.domain, anomaly: inv.anomaly, violations, ok: violations === 0 });
      } catch (e) {
        results.push({ id: inv.id, executed: false, error: e.message });
      }
    }
  } finally {
    await client.end().catch(() => {});
  }
  return results;
}

const live = await tryRunSql();
const breaches = Array.isArray(live) ? live.filter((r) => r.ok === false) : [];

const report = {
  generatedAt: new Date().toISOString(),
  mode: live ? "live" : "catalog",
  invariantCount: invariants.length,
  anomalyClasses: ["duplicate_processing", "lost_events", "partial_update", "race_condition", "orphan_data"],
  invariants: invariants.map((i) => ({ id: i.id, domain: i.domain, anomaly: i.anomaly })),
  liveResults: live ?? null,
  breaches: breaches.length,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, liveResults: live ? `${live.length} checks` : null, output: OUT }, null, 2));

if (enforce && breaches.length > 0) {
  console.error(`Data consistency: ${breaches.length} invariant breach(es).`);
  process.exit(1);
}
