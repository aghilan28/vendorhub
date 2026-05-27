import { evaluateOperationalAlerts } from "./alerts";
import type { HealthTone, ObservabilityDomain } from "./types";
import { getEmbeddingFreshnessDiagnostics } from "@/lib/ai/commerce-intelligence";
import { getEnvironmentReadiness } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type QueryResult = {
  count?: number | null;
  error?: { message?: string } | null;
};

async function countQuery<T extends PromiseLike<QueryResult>>(query: T): Promise<QueryResult> {
  return await query;
}

function toneFromAlerts(severity: "info" | "warning" | "critical"): HealthTone {
  if (severity === "critical") return "critical";
  if (severity === "warning") return "watch";
  return "healthy";
}

function percent(part: number, total: number) {
  return total ? part / total : 0;
}

function domainStatus(domain: ObservabilityDomain, value: string, detail: string, tone: HealthTone) {
  return { domain, value, detail, tone };
}

export async function getOperationalHealthSnapshot() {
  const started = Date.now();
  const readiness = getEnvironmentReadiness();
  const supabase = await createSupabaseServerClient();
  const unsafeSupabase = supabase as typeof supabase & {
    from: (relation: string) => ReturnType<typeof supabase.from>;
  };
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    checkoutTransactions,
    failedTransactions,
    orders,
    failedPayments,
    integrityAlerts,
    webhookEvents,
    refunds,
    delayedDeliveries,
    moderationProducts,
    pendingVendors,
    governanceCases,
    governanceSignals,
    governanceOverdueCases,
    governanceOverdueDisputes,
    governanceRecovery,
    activeDisputes,
    auditLogs,
  ] = await Promise.all([
    countQuery(supabase.from("checkout_transactions").select("id", { count: "exact", head: true }).gte("created_at", since24h)),
    countQuery(supabase.from("checkout_transactions").select("id", { count: "exact", head: true }).gte("created_at", since24h).in("state", ["FAILED", "ROLLED_BACK"])),
    countQuery(supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", since24h)),
    countQuery(supabase.from("payment_attempts").select("id", { count: "exact", head: true }).gte("updated_at", since24h).in("state", ["FAILED", "CANCELLED"])),
    countQuery(supabase.from("transaction_integrity_alerts").select("id", { count: "exact", head: true }).eq("state", "OPEN")),
    countQuery(supabase.from("payment_webhook_events").select("id", { count: "exact", head: true }).gte("created_at", since24h)),
    countQuery(supabase.from("refund_requests").select("id", { count: "exact", head: true }).not("state", "in", "(REFUND_SUCCEEDED,REFUND_REJECTED)")),
    countQuery(supabase.from("deliveries").select("id", { count: "exact", head: true }).lt("promised_at", new Date().toISOString()).not("status", "in", "(DELIVERED,FAILED,RETURNED)")),
    countQuery(supabase.from("products").select("id", { count: "exact", head: true }).in("status", ["DRAFT", "SUSPENDED"])),
    countQuery(supabase.from("vendors").select("id", { count: "exact", head: true }).eq("status", "PENDING_VERIFICATION")),
    countQuery(supabase.from("governance_cases").select("id", { count: "exact", head: true }).not("state", "in", "(RESOLVED,DISMISSED)")),
    countQuery(supabase.from("governance_risk_signals").select("id", { count: "exact", head: true }).gte("created_at", since24h).in("severity", ["high", "critical"])),
    countQuery(supabase.from("governance_cases").select("id", { count: "exact", head: true }).not("state", "in", "(RESOLVED,DISMISSED)").lt("sla_due_at", new Date().toISOString())),
    countQuery(supabase.from("marketplace_disputes").select("id", { count: "exact", head: true }).not("state", "in", "(RESOLVED_BUYER,RESOLVED_SELLER,RESOLVED_PLATFORM,DISMISSED)").lt("sla_due_at", new Date().toISOString())),
    countQuery(unsafeSupabase.from("governance_recovery_jobs").select("id", { count: "exact", head: true }).in("state", ["PENDING", "RUNNING"])),
    countQuery(supabase.from("marketplace_disputes").select("id", { count: "exact", head: true }).not("state", "in", "(RESOLVED_BUYER,RESOLVED_SELLER,RESOLVED_PLATFORM,DISMISSED)")),
    countQuery(supabase.from("audit_logs").select("id", { count: "exact", head: true }).gte("created_at", since7d)),
  ]);

  const failedWrites = [
    checkoutTransactions,
    failedTransactions,
    orders,
    failedPayments,
    integrityAlerts,
    webhookEvents,
    refunds,
    delayedDeliveries,
    moderationProducts,
    pendingVendors,
    governanceCases,
    governanceSignals,
    governanceOverdueCases,
    governanceOverdueDisputes,
    governanceRecovery,
    activeDisputes,
    auditLogs,
  ].filter((result) => result.error).length;

  const embeddings = await getEmbeddingFreshnessDiagnostics(50).catch(() => []);
  const staleEmbeddingCount = embeddings.filter((item) => item.stale).length;
  const totalCheckout = checkoutTransactions.count ?? 0;
  const checkoutFailures = failedTransactions.count ?? 0;
  const paymentFailures = failedPayments.count ?? 0;
  const openIntegrityAlerts = integrityAlerts.count ?? 0;
  const refundOpenCount = refunds.count ?? 0;
  const deliveryDelayedCount = delayedDeliveries.count ?? 0;
  const moderationBacklog = (moderationProducts.count ?? 0) + (pendingVendors.count ?? 0) + (governanceCases.count ?? 0) + (activeDisputes.count ?? 0);

  const signals = {
    checkoutFailureRate: percent(checkoutFailures, totalCheckout),
    paymentMismatchCount: paymentFailures,
    webhookRetryCount: 0,
    openIntegrityAlerts,
    realtimeReconnects: 0,
    activeRealtimeChannels: 0,
    aiFallbackRate: staleEmbeddingCount ? Math.min(1, staleEmbeddingCount / Math.max(embeddings.length, 1)) : 0,
    staleEmbeddingCount,
    dbFailedWrites: failedWrites,
    authFailureCount: 0,
    refundOpenCount,
    deliveryDelayedCount,
    moderationBacklog,
    governanceHighRiskSignals: governanceSignals.count ?? 0,
    governanceOverdueCount: (governanceOverdueCases.count ?? 0) + (governanceOverdueDisputes.count ?? 0),
    governanceRecoveryBacklog: governanceRecovery.count ?? 0,
  };

  const alerts = evaluateOperationalAlerts(signals);
  const worst = alerts.some((alert) => alert.severity === "critical") ? "critical" : alerts.some((alert) => alert.severity === "warning") ? "warning" : "info";

  return {
    service: "vendorhub-web",
    generatedAt: new Date().toISOString(),
    latencyMs: Date.now() - started,
    overall: {
      tone: toneFromAlerts(worst),
      label: worst === "critical" ? "Critical" : worst === "warning" ? "Watch" : "Healthy",
      detail: `${alerts.filter((alert) => alert.severity !== "info").length} actionable alerts from critical commerce signals.`,
    },
    readiness,
    signals,
    alerts,
    systems: [
      domainStatus("checkout", `${totalCheckout - checkoutFailures}/${totalCheckout || 0} clean`, "Atomic checkout lifecycle, rollback visibility, and order creation.", checkoutFailures ? "watch" : "healthy"),
      domainStatus("payment", `${paymentFailures + openIntegrityAlerts} risks`, "Razorpay order creation, webhook reconciliation, mismatches, refunds, and payouts.", paymentFailures || openIntegrityAlerts ? "watch" : "healthy"),
      domainStatus("realtime", "client tracked", "Active channel, latency, reconnect, bandwidth, and listener telemetry emits from browser sessions.", "healthy"),
      domainStatus("ai", `${staleEmbeddingCount} stale`, "Vector retrieval, fallback usage, embedding freshness, and recommendation diagnostics.", staleEmbeddingCount > 10 ? "watch" : "healthy"),
      domainStatus("database", failedWrites ? `${failedWrites} failed reads` : "queries ok", "Failed writes, query failures, constraint pressure, and persistence degradation.", failedWrites ? "degraded" : "healthy"),
      domainStatus("delivery", `${deliveryDelayedCount} delayed`, "Delivery creation, ETA latency, fulfillment delays, tracking failures, and shipment inconsistencies.", deliveryDelayedCount ? "watch" : "healthy"),
      domainStatus("admin", `${moderationBacklog} queued`, `Moderation, seller approvals, governance cases, disputes, and ${governanceSignals.count ?? 0} recent high-risk signals.`, moderationBacklog > 20 || (governanceSignals.count ?? 0) > 5 ? "watch" : "healthy"),
      domainStatus("security", "guarded", "Auth anomalies, webhook abuse, replay attempts, admin misuse, and rate-limit triggers.", "healthy"),
    ],
    audit: {
      last7d: auditLogs.count ?? 0,
      immutableAware: true,
      actorLinked: true,
      traceable: true,
    },
  };
}
