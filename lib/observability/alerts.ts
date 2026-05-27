import type { OperationalAlert } from "./types";

export type AlertSignalInput = {
  checkoutFailureRate: number;
  paymentMismatchCount: number;
  webhookRetryCount: number;
  openIntegrityAlerts: number;
  realtimeReconnects: number;
  activeRealtimeChannels: number;
  aiFallbackRate: number;
  staleEmbeddingCount: number;
  dbFailedWrites: number;
  authFailureCount: number;
  refundOpenCount: number;
  deliveryDelayedCount: number;
  moderationBacklog: number;
  governanceHighRiskSignals?: number;
  governanceOverdueCount?: number;
  governanceRecoveryBacklog?: number;
  queueSaturationPressure?: number;
  deadLetterCount?: number;
  reconciliationBacklog?: number;
  rollbackSloBreaches?: number;
  workerStarvationCount?: number;
  retryAmplificationRatio?: number;
  durableEventBacklog?: number;
  logisticsProviderOutageCount?: number;
  logisticsDispatchBacklog?: number;
  logisticsZonePressure?: number;
  logisticsFailoverCount?: number;
  logisticsRoutingImbalance?: number;
  tenantIsolationWarnings?: number;
  permissionAbuseSignals?: number;
  organizationRecoveryFailures?: number;
  auditInconsistencyCount?: number;
  tenantSaturationCount?: number;
  regionalOutageCount?: number;
  crossRegionDesyncCount?: number;
  failoverInstabilityCount?: number;
  edgeCacheCorruptionCount?: number;
  realtimeGeoInstabilityCount?: number;
  regionalQueueSaturationCount?: number;
  observabilityFragmentationCount?: number;
  globalReplayAnomalyCount?: number;
  publicApiErrorRate?: number;
  webhookReplayStormCount?: number;
  webhookDeadLetterCount?: number;
  sdkContractDriftCount?: number;
  externalAuthFailureCount?: number;
  partnerOutageCount?: number;
  platformTenantLeakageCount?: number;
  failedSelfHealingCount?: number;
  remediationLoopCount?: number;
  cascadingFailureRiskCount?: number;
  anomalySaturationCount?: number;
  recoveryDeadlockCount?: number;
  operationalOverloadCount?: number;
  replayAmplificationCount?: number;
  containmentInstabilityCount?: number;
  failoverOscillationCount?: number;
  alertSuppressionFailureCount?: number;
  remediationCooldownViolationCount?: number;
  executiveForecastDriftCount?: number;
  executiveAlertOverloadCount?: number;
  strategicAnomalySpikeCount?: number;
  marketplaceGrowthSaturation?: number;
  financeVolatilityIndicator?: number;
  logisticsOverloadPrediction?: number;
};

export function evaluateOperationalAlerts(signals: AlertSignalInput): OperationalAlert[] {
  const alerts: OperationalAlert[] = [];

  if (signals.checkoutFailureRate >= 0.08) {
    alerts.push({
      id: "checkout-failure-spike",
      title: "Checkout failure spike",
      domain: "checkout",
      severity: signals.checkoutFailureRate >= 0.15 ? "critical" : "warning",
      signal: `${Math.round(signals.checkoutFailureRate * 100)}% failure rate`,
      action: "Inspect atomic checkout RPC errors, inventory lock contention, and payment intent creation.",
    });
  }

  if (signals.paymentMismatchCount || signals.openIntegrityAlerts) {
    alerts.push({
      id: "payment-integrity-risk",
      title: "Payment integrity risk",
      domain: "payment",
      severity: signals.paymentMismatchCount > 2 || signals.openIntegrityAlerts > 4 ? "critical" : "warning",
      signal: `${signals.paymentMismatchCount + signals.openIntegrityAlerts} payment integrity signals`,
      action: "Run reconciliation and inspect orphan payments, amount mismatches, duplicate webhook events, and refund states.",
    });
  }

  if (signals.webhookRetryCount > 5) {
    alerts.push({
      id: "webhook-retry-pressure",
      title: "Webhook retry pressure",
      domain: "reconciliation",
      severity: "warning",
      signal: `${signals.webhookRetryCount} retry-like webhook events`,
      action: "Check Razorpay webhook signatures, replay attempts, provider delays, and reconciliation RPC latency.",
    });
  }

  if (signals.realtimeReconnects > 10 || signals.activeRealtimeChannels > 80) {
    alerts.push({
      id: "realtime-storm-risk",
      title: "Realtime storm risk",
      domain: "realtime",
      severity: signals.realtimeReconnects > 25 ? "critical" : "warning",
      signal: `${signals.realtimeReconnects} reconnects, ${signals.activeRealtimeChannels} channels`,
      action: "Check leader-tab leases, stale listeners, channel growth, duplicate propagation, and unauthorized streams.",
    });
  }

  if (signals.aiFallbackRate >= 0.2 || signals.staleEmbeddingCount > 10) {
    alerts.push({
      id: "ai-degradation",
      title: "AI retrieval degradation",
      domain: "ai",
      severity: signals.aiFallbackRate >= 0.4 ? "critical" : "warning",
      signal: `${Math.round(signals.aiFallbackRate * 100)}% fallback rate, ${signals.staleEmbeddingCount} stale embeddings`,
      action: "Inspect vector query latency, embedding freshness, OpenAI availability, and recommendation candidate collapse.",
    });
  }

  if (signals.dbFailedWrites > 0) {
    alerts.push({
      id: "database-write-failures",
      title: "Database persistence degradation",
      domain: "database",
      severity: signals.dbFailedWrites > 5 ? "critical" : "warning",
      signal: `${signals.dbFailedWrites} failed write signals`,
      action: "Inspect failed writes, constraint violations, deadlocks, transaction retries, and migration drift.",
    });
  }

  if (signals.authFailureCount > 12) {
    alerts.push({
      id: "auth-anomaly",
      title: "Auth anomaly",
      domain: "security",
      severity: signals.authFailureCount > 30 ? "critical" : "warning",
      signal: `${signals.authFailureCount} auth failures`,
      action: "Inspect suspicious login activity, replay attempts, rate-limit triggers, and admin misuse attempts.",
    });
  }

  if (signals.deliveryDelayedCount > 4) {
    alerts.push({
      id: "delivery-delay-pressure",
      title: "Delivery delay pressure",
      domain: "delivery",
      severity: "warning",
      signal: `${signals.deliveryDelayedCount} delayed deliveries`,
      action: "Inspect ETA calculations, shipment state transitions, tracking event delays, and fulfillment handoffs.",
    });
  }

  if (signals.moderationBacklog > 20) {
    alerts.push({
      id: "moderation-backlog",
      title: "Moderation backlog",
      domain: "admin",
      severity: "warning",
      signal: `${signals.moderationBacklog} governance items pending`,
      action: "Review trust escalation patterns, seller approvals, product moderation, and compliance workflow bottlenecks.",
    });
  }

  const governanceHighRiskSignals = signals.governanceHighRiskSignals ?? 0;
  const governanceOverdueCount = signals.governanceOverdueCount ?? 0;
  const governanceRecoveryBacklog = signals.governanceRecoveryBacklog ?? 0;

  if (governanceHighRiskSignals > 5 || governanceOverdueCount > 0 || governanceRecoveryBacklog > 20) {
    alerts.push({
      id: "governance-pressure",
      title: "Governance pressure",
      domain: "admin",
      severity: governanceHighRiskSignals > 15 || governanceOverdueCount > 10 || governanceRecoveryBacklog > 50 ? "critical" : "warning",
      signal: `${governanceHighRiskSignals} high-risk signals, ${governanceOverdueCount} overdue reviews, ${governanceRecoveryBacklog} recovery jobs`,
      action: "Run governance recovery, reassign stale moderation/dispute work, inspect payout holds, and verify KYC escalation queues.",
    });
  }

  const queueSaturationPressure = signals.queueSaturationPressure ?? 0;
  const deadLetterCount = signals.deadLetterCount ?? 0;
  const reconciliationBacklog = signals.reconciliationBacklog ?? 0;
  const rollbackSloBreaches = signals.rollbackSloBreaches ?? 0;
  const workerStarvationCount = signals.workerStarvationCount ?? 0;
  const retryAmplificationRatio = signals.retryAmplificationRatio ?? 0;
  const durableEventBacklog = signals.durableEventBacklog ?? 0;
  const logisticsProviderOutageCount = signals.logisticsProviderOutageCount ?? 0;
  const logisticsDispatchBacklog = signals.logisticsDispatchBacklog ?? 0;
  const logisticsZonePressure = signals.logisticsZonePressure ?? 0;
  const logisticsFailoverCount = signals.logisticsFailoverCount ?? 0;
  const logisticsRoutingImbalance = signals.logisticsRoutingImbalance ?? 0;
  const tenantIsolationWarnings = signals.tenantIsolationWarnings ?? 0;
  const permissionAbuseSignals = signals.permissionAbuseSignals ?? 0;
  const organizationRecoveryFailures = signals.organizationRecoveryFailures ?? 0;
  const auditInconsistencyCount = signals.auditInconsistencyCount ?? 0;
  const tenantSaturationCount = signals.tenantSaturationCount ?? 0;
  const regionalOutageCount = signals.regionalOutageCount ?? 0;
  const crossRegionDesyncCount = signals.crossRegionDesyncCount ?? 0;
  const failoverInstabilityCount = signals.failoverInstabilityCount ?? 0;
  const edgeCacheCorruptionCount = signals.edgeCacheCorruptionCount ?? 0;
  const realtimeGeoInstabilityCount = signals.realtimeGeoInstabilityCount ?? 0;
  const regionalQueueSaturationCount = signals.regionalQueueSaturationCount ?? 0;
  const observabilityFragmentationCount = signals.observabilityFragmentationCount ?? 0;
  const globalReplayAnomalyCount = signals.globalReplayAnomalyCount ?? 0;
  const publicApiErrorRate = signals.publicApiErrorRate ?? 0;
  const webhookReplayStormCount = signals.webhookReplayStormCount ?? 0;
  const webhookDeadLetterCount = signals.webhookDeadLetterCount ?? 0;
  const sdkContractDriftCount = signals.sdkContractDriftCount ?? 0;
  const externalAuthFailureCount = signals.externalAuthFailureCount ?? 0;
  const partnerOutageCount = signals.partnerOutageCount ?? 0;
  const platformTenantLeakageCount = signals.platformTenantLeakageCount ?? 0;
  const failedSelfHealingCount = signals.failedSelfHealingCount ?? 0;
  const remediationLoopCount = signals.remediationLoopCount ?? 0;
  const cascadingFailureRiskCount = signals.cascadingFailureRiskCount ?? 0;
  const anomalySaturationCount = signals.anomalySaturationCount ?? 0;
  const recoveryDeadlockCount = signals.recoveryDeadlockCount ?? 0;
  const operationalOverloadCount = signals.operationalOverloadCount ?? 0;
  const replayAmplificationCount = signals.replayAmplificationCount ?? 0;
  const containmentInstabilityCount = signals.containmentInstabilityCount ?? 0;
  const failoverOscillationCount = signals.failoverOscillationCount ?? 0;
  const alertSuppressionFailureCount = signals.alertSuppressionFailureCount ?? 0;
  const remediationCooldownViolationCount = signals.remediationCooldownViolationCount ?? 0;
  const executiveForecastDriftCount = signals.executiveForecastDriftCount ?? 0;
  const executiveAlertOverloadCount = signals.executiveAlertOverloadCount ?? 0;
  const strategicAnomalySpikeCount = signals.strategicAnomalySpikeCount ?? 0;
  const marketplaceGrowthSaturation = signals.marketplaceGrowthSaturation ?? 0;
  const financeVolatilityIndicator = signals.financeVolatilityIndicator ?? 0;
  const logisticsOverloadPrediction = signals.logisticsOverloadPrediction ?? 0;

  if (tenantIsolationWarnings > 0) {
    alerts.push({
      id: "tenant-isolation-risk",
      title: "Tenant isolation risk",
      domain: "enterprise",
      severity: "critical",
      signal: `${tenantIsolationWarnings} tenant boundary warnings`,
      action: "Freeze cross-tenant projections, inspect organization envelopes, replay scoped audit events, and block unsafe admin actions.",
    });
  }

  if (publicApiErrorRate > 0.05) {
    alerts.push({
      id: "public-api-platform-saturation",
      title: "Public API platform saturation",
      domain: "api",
      severity: publicApiErrorRate > 0.12 ? "critical" : "warning",
      signal: `${Math.round(publicApiErrorRate * 100)}% public API error rate`,
      action: "Throttle abusive integrations, inspect API contract failures, and route reads to healthy regions.",
    });
  }

  if (webhookReplayStormCount > 0 || webhookDeadLetterCount > 0) {
    alerts.push({
      id: "developer-webhook-reliability-risk",
      title: "Developer webhook reliability risk",
      domain: "api",
      severity: webhookReplayStormCount > 2 || webhookDeadLetterCount > 10 ? "critical" : "warning",
      signal: `${webhookReplayStormCount} replay storms, ${webhookDeadLetterCount} dead letters`,
      action: "Dedupe webhook replay keys, pause unstable endpoint fanout, and run webhook dead-letter recovery.",
    });
  }

  if (sdkContractDriftCount > 0) {
    alerts.push({
      id: "sdk-contract-drift-risk",
      title: "SDK contract drift risk",
      domain: "api",
      severity: "critical",
      signal: `${sdkContractDriftCount} SDK contract drift signals`,
      action: "Block SDK release, regenerate typed clients, and validate public API contract compatibility.",
    });
  }

  if (externalAuthFailureCount > 20 || partnerOutageCount > 0 || platformTenantLeakageCount > 0) {
    alerts.push({
      id: "partner-integration-security-risk",
      title: "Partner integration security risk",
      domain: "security",
      severity: platformTenantLeakageCount > 0 || externalAuthFailureCount > 50 ? "critical" : "warning",
      signal: `${externalAuthFailureCount} auth failures, ${partnerOutageCount} partner outages, ${platformTenantLeakageCount} tenant leakage signals`,
      action: "Revoke suspicious tokens, isolate partner queues, and replay tenant-scoped integration audit trails.",
    });
  }

  if (failedSelfHealingCount > 0 || remediationLoopCount > 0 || recoveryDeadlockCount > 0) {
    alerts.push({
      id: "autonomous-remediation-risk",
      title: "Autonomous remediation risk",
      domain: "system",
      severity: failedSelfHealingCount > 2 || remediationLoopCount > 0 || recoveryDeadlockCount > 0 ? "critical" : "warning",
      signal: `${failedSelfHealingCount} failed healing attempts, ${remediationLoopCount} remediation loops, ${recoveryDeadlockCount} deadlocks`,
      action: "Freeze autonomous remediation loops, preserve recovery cursors, and require approval before retrying risky actions.",
    });
  }

  if (replayAmplificationCount > 0 || remediationCooldownViolationCount > 0) {
    alerts.push({
      id: "autonomous-replay-remediation-guardrail-risk",
      title: "Autonomous replay remediation guardrail risk",
      domain: "system",
      severity: replayAmplificationCount > 2 || remediationCooldownViolationCount > 0 ? "critical" : "warning",
      signal: `${replayAmplificationCount} replay amplification signals, ${remediationCooldownViolationCount} cooldown violations`,
      action: "Quarantine replay keys, stop cooldown-violating remediations, and resume recovery only from deterministic traces.",
    });
  }

  if (containmentInstabilityCount > 0 || failoverOscillationCount > 0 || alertSuppressionFailureCount > 0) {
    alerts.push({
      id: "autonomous-resilience-stability-risk",
      title: "Autonomous resilience stability risk",
      domain: "system",
      severity: containmentInstabilityCount > 1 || failoverOscillationCount > 0 || alertSuppressionFailureCount > 0 ? "critical" : "warning",
      signal: `${containmentInstabilityCount} containment instability signals, ${failoverOscillationCount} failover oscillations, ${alertSuppressionFailureCount} suppression failures`,
      action: "Freeze oscillating automation, group alerts by suppression key, validate containment drift, and keep failback disabled until stable.",
    });
  }

  if (executiveForecastDriftCount > 0 || strategicAnomalySpikeCount > 0 || executiveAlertOverloadCount > 0) {
    alerts.push({
      id: "executive-intelligence-stability-risk",
      title: "Executive intelligence stability risk",
      domain: "system",
      severity: executiveForecastDriftCount > 2 || executiveAlertOverloadCount > 0 ? "critical" : "warning",
      signal: `${executiveForecastDriftCount} forecast drift signals, ${strategicAnomalySpikeCount} anomaly spikes, ${executiveAlertOverloadCount} executive alert overload signals`,
      action: "Mark unstable forecasts advisory, group strategic alerts by business impact, and rebuild executive summaries from source telemetry.",
    });
  }

  if (marketplaceGrowthSaturation > 0.75 || financeVolatilityIndicator > 0.75 || logisticsOverloadPrediction > 0.75) {
    alerts.push({
      id: "executive-business-pressure-risk",
      title: "Executive business pressure risk",
      domain: "system",
      severity: marketplaceGrowthSaturation > 1 || financeVolatilityIndicator > 1 || logisticsOverloadPrediction > 1 ? "critical" : "warning",
      signal: `${Math.round(marketplaceGrowthSaturation * 100)}% growth saturation, ${Math.round(financeVolatilityIndicator * 100)}% finance volatility, ${Math.round(logisticsOverloadPrediction * 100)}% logistics overload prediction`,
      action: "Prioritize inventory, finance reconciliation, and logistics capacity decisions before demand expansion.",
    });
  }

  if (cascadingFailureRiskCount > 0 || anomalySaturationCount > 0 || operationalOverloadCount > 0) {
    alerts.push({
      id: "autonomous-cascading-failure-risk",
      title: "Autonomous cascading failure risk",
      domain: "system",
      severity: cascadingFailureRiskCount > 1 || operationalOverloadCount > 1 ? "critical" : "warning",
      signal: `${cascadingFailureRiskCount} cascading risks, ${anomalySaturationCount} saturated anomalies, ${operationalOverloadCount} overload signals`,
      action: "Activate containment, throttle retry amplification, group incidents by suppression key, and preserve core commerce capacity.",
    });
  }

  if (permissionAbuseSignals > 0) {
    alerts.push({
      id: "permission-abuse-risk",
      title: "Permission abuse risk",
      domain: "enterprise",
      severity: permissionAbuseSignals > 4 ? "critical" : "warning",
      signal: `${permissionAbuseSignals} suspicious permission or elevation signals`,
      action: "Revoke temporary elevations, require approval gates, inspect RBAC/ABAC grants, and run permission rollback.",
    });
  }

  if (organizationRecoveryFailures > 0 || auditInconsistencyCount > 0) {
    alerts.push({
      id: "enterprise-recovery-risk",
      title: "Enterprise recovery risk",
      domain: "enterprise",
      severity: organizationRecoveryFailures > 1 || auditInconsistencyCount > 3 ? "critical" : "warning",
      signal: `${organizationRecoveryFailures} recovery failures, ${auditInconsistencyCount} audit inconsistencies`,
      action: "Run organization recovery tooling, verify immutable audit trails, and keep lifecycle transitions approval-gated.",
    });
  }

  if (tenantSaturationCount > 0) {
    alerts.push({
      id: "tenant-saturation-risk",
      title: "Tenant saturation risk",
      domain: "enterprise",
      severity: tenantSaturationCount > 3 ? "critical" : "warning",
      signal: `${tenantSaturationCount} saturated organizations`,
      action: "Throttle tenant-local floods, reserve governance workers, and segment analytics/realtime load by organization.",
    });
  }

  if (regionalOutageCount > 0 || failoverInstabilityCount > 0) {
    alerts.push({
      id: "global-regional-failover-risk",
      title: "Global regional failover risk",
      domain: "system",
      severity: regionalOutageCount > 1 || failoverInstabilityCount > 2 ? "critical" : "warning",
      signal: `${regionalOutageCount} regional outages, ${failoverInstabilityCount} unstable failovers`,
      action: "Route around failed regions, freeze critical writes when consistency is uncertain, and replay regional queues after health recovery.",
    });
  }

  if (crossRegionDesyncCount > 0 || globalReplayAnomalyCount > 0) {
    alerts.push({
      id: "cross-region-consistency-risk",
      title: "Cross-region consistency risk",
      domain: "system",
      severity: crossRegionDesyncCount > 2 || globalReplayAnomalyCount > 5 ? "critical" : "warning",
      signal: `${crossRegionDesyncCount} desync signals, ${globalReplayAnomalyCount} replay anomalies`,
      action: "Dedupe global replay keys, verify regional cursors, and keep latency optimization behind consistency guardrails.",
    });
  }

  if (edgeCacheCorruptionCount > 0) {
    alerts.push({
      id: "edge-cache-corruption-risk",
      title: "Edge cache corruption risk",
      domain: "system",
      severity: edgeCacheCorruptionCount > 2 ? "critical" : "warning",
      signal: `${edgeCacheCorruptionCount} edge cache corruption signals`,
      action: "Bypass corrupted edge versions, replay invalidation logs, and repair regional cache cursors before serving fresh claims.",
    });
  }

  if (realtimeGeoInstabilityCount > 0 || regionalQueueSaturationCount > 0 || observabilityFragmentationCount > 0) {
    alerts.push({
      id: "geo-operational-fragmentation-risk",
      title: "Geo operational fragmentation risk",
      domain: "system",
      severity: realtimeGeoInstabilityCount > 3 || regionalQueueSaturationCount > 2 || observabilityFragmentationCount > 1 ? "critical" : "warning",
      signal: `${realtimeGeoInstabilityCount} realtime geo issues, ${regionalQueueSaturationCount} saturated regional queues, ${observabilityFragmentationCount} observability gaps`,
      action: "Throttle cross-region fanout, isolate regional queue partitions, and rebuild global health projections from regional truth.",
    });
  }

  if (queueSaturationPressure > 500 || deadLetterCount > 0) {
    alerts.push({
      id: "queue-saturation-risk",
      title: "Queue saturation risk",
      domain: "system",
      severity: queueSaturationPressure > 1000 || deadLetterCount > 5 ? "critical" : "warning",
      signal: `${queueSaturationPressure} queue pressure, ${deadLetterCount} dead letters`,
      action: "Throttle producers, isolate retry-heavy jobs, run async recovery, and inspect dead-letter replay safety.",
    });
  }

  if (workerStarvationCount > 0) {
    alerts.push({
      id: "worker-starvation-risk",
      title: "Worker starvation risk",
      domain: "system",
      severity: workerStarvationCount > 2 ? "critical" : "warning",
      signal: `${workerStarvationCount} worker pools have queued work without active workers`,
      action: "Start the affected worker pools, verify heartbeats, and keep commerce/reconciliation pools ahead of bulk compute.",
    });
  }

  if (retryAmplificationRatio > 0.35) {
    alerts.push({
      id: "retry-amplification-risk",
      title: "Retry amplification risk",
      domain: "system",
      severity: retryAmplificationRatio > 0.7 ? "critical" : "warning",
      signal: `${Math.round(retryAmplificationRatio * 100)}% retry-to-queued ratio`,
      action: "Throttle retry-heavy producers, widen backoff windows, inspect poison payloads, and isolate dead-letter replay.",
    });
  }

  if (durableEventBacklog > 100) {
    alerts.push({
      id: "durable-event-backlog",
      title: "Durable event backlog",
      domain: "system",
      severity: durableEventBacklog > 500 ? "critical" : "warning",
      signal: `${durableEventBacklog} durable events pending or retrying`,
      action: "Run durable event processors, inspect route failures, and verify event sequencing before replaying financial events.",
    });
  }

  if (reconciliationBacklog > 50) {
    alerts.push({
      id: "reconciliation-backlog-risk",
      title: "Reconciliation backlog risk",
      domain: "reconciliation",
      severity: reconciliationBacklog > 150 ? "critical" : "warning",
      signal: `${reconciliationBacklog} reconciliation items pending`,
      action: "Run payment, delivery, governance, and India-commerce recovery jobs before releasing payouts or closing incidents.",
    });
  }

  if (logisticsProviderOutageCount > 0 || logisticsFailoverCount > 5) {
    alerts.push({
      id: "logistics-provider-failover-risk",
      title: "Logistics provider failover risk",
      domain: "delivery",
      severity: logisticsProviderOutageCount > 1 || logisticsFailoverCount > 10 ? "critical" : "warning",
      signal: `${logisticsProviderOutageCount} unhealthy providers, ${logisticsFailoverCount} failovers in the last hour`,
      action: "Run provider failover recovery, verify cooldown windows, and keep seller-self fallback capacity available.",
    });
  }

  if (logisticsDispatchBacklog > 100 || logisticsZonePressure > 0.85 || logisticsRoutingImbalance > 0) {
    alerts.push({
      id: "live-logistics-network-pressure",
      title: "Live logistics network pressure",
      domain: "delivery",
      severity: logisticsDispatchBacklog > 250 || logisticsZonePressure > 0.95 ? "critical" : "warning",
      signal: `${logisticsDispatchBacklog} dispatch backlog, ${Math.round(logisticsZonePressure * 100)}% max zone pressure, ${logisticsRoutingImbalance} routing imbalances`,
      action: "Run dispatch recalculation, routing refresh, congestion analysis, and dynamic SLA enforcement.",
    });
  }

  if (rollbackSloBreaches > 0) {
    alerts.push({
      id: "rollback-slo-breach",
      title: "Rollback SLO breach",
      domain: "system",
      severity: "critical",
      signal: `${rollbackSloBreaches} rollback rehearsal breaches`,
      action: "Quarantine deployment, verify backup evidence, run smoke checks, and keep write paths frozen until recovery is proven.",
    });
  }

  if (!alerts.length) {
    alerts.push({
      id: "platform-observable",
      title: "No high-signal incidents",
      domain: "system",
      severity: "info",
      signal: "Critical signals within guardrails",
      action: "Continue monitoring checkout, payment reconciliation, realtime, AI retrieval, delivery, and database telemetry.",
    });
  }

  return alerts;
}
