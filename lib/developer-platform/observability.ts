import type { PlatformTelemetryInput, PlatformValidationReport } from "./types";

export function evaluatePlatformTelemetry(input: PlatformTelemetryInput) {
  const alerts: Array<{ id: string; severity: "warning" | "critical"; signal: string; action: string }> = [];

  if (input.apiLatencyMs > 900 || input.apiErrorRate > 0.05) {
    alerts.push({ id: "public-api-saturation", severity: input.apiErrorRate > 0.12 ? "critical" : "warning", signal: `${input.apiLatencyMs}ms API latency, ${Math.round(input.apiErrorRate * 100)}% errors`, action: "Throttle abusive integrations, route reads to healthy regions, and inspect contract failures." });
  }
  if (input.webhookRetryRate > 0.12 || input.webhookDeadLetters > 0) {
    alerts.push({ id: "webhook-delivery-risk", severity: input.webhookDeadLetters > 10 ? "critical" : "warning", signal: `${Math.round(input.webhookRetryRate * 100)}% retry rate, ${input.webhookDeadLetters} dead letters`, action: "Pause endpoint fanout, dedupe replay keys, and run webhook dead-letter recovery." });
  }
  if (input.integrationFailureRate > 0.08 || input.externalQueuePressure > 0.9) {
    alerts.push({ id: "partner-integration-instability", severity: input.integrationFailureRate > 0.18 ? "critical" : "warning", signal: `${Math.round(input.integrationFailureRate * 100)}% integration failures`, action: "Isolate partner queue partitions and shed non-critical event streams." });
  }
  if (input.sdkContractDrift > 0) {
    alerts.push({ id: "sdk-compatibility-drift", severity: "critical", signal: `${input.sdkContractDrift} SDK contract drift signals`, action: "Block SDK release and regenerate clients from stable public contracts." });
  }
  if (input.externalAuthFailures > 20 || input.rateLimitSaturation > 0.95) {
    alerts.push({ id: "external-auth-abuse", severity: input.externalAuthFailures > 50 ? "critical" : "warning", signal: `${input.externalAuthFailures} auth failures`, action: "Revoke suspicious tokens, rotate affected credentials, and tighten scoped rate limits." });
  }
  if (input.tenantLeakageSignals > 0) {
    alerts.push({ id: "platform-tenant-leakage-risk", severity: "critical", signal: `${input.tenantLeakageSignals} tenant leakage signals`, action: "Freeze affected integration, seal event cursor, and replay tenant-scoped audit trail." });
  }
  if (input.replayFrequency > 0.15) {
    alerts.push({ id: "platform-replay-storm", severity: input.replayFrequency > 0.3 ? "critical" : "warning", signal: `${Math.round(input.replayFrequency * 100)}% replay frequency`, action: "Dedupe replay keys, quarantine duplicate webhook deliveries, and drain external replay queues." });
  }

  return alerts;
}

export function validateDeveloperPlatform(input: PlatformTelemetryInput, now = new Date()): PlatformValidationReport {
  const alerts = evaluatePlatformTelemetry(input);
  const risks = alerts.map((alert) => alert.id);

  return {
    productionSafe: risks.length === 0,
    risks,
    gracefulDegradation: risks.length
      ? ["throttle external integrations", "pause webhook fanout for unstable endpoints", "preserve tenant-scoped event cursors", "keep core commerce queues isolated"]
      : [],
    replaySafe: input.replayFrequency <= 0.15 && input.webhookDeadLetters <= 10,
    developerObservable: input.apiLatencyMs >= 0 && input.externalQueuePressure >= 0,
    checkedAt: now.toISOString(),
  };
}

export function simulatePlatformFailure(mode: "webhook_outage" | "api_version_mismatch" | "sdk_contract_drift" | "replay_duplication" | "partner_collapse" | "external_queue_saturation") {
  const actions = {
    webhook_outage: ["pause endpoint fanout", "move failed deliveries to dead-letter queue", "replay from durable webhook cursor"],
    api_version_mismatch: ["reject unsupported version", "return supported versions", "record contract governance alert"],
    sdk_contract_drift: ["block SDK release", "regenerate TypeScript client", "run compatibility tests"],
    replay_duplication: ["dedupe idempotency keys", "quarantine duplicate deliveries", "preserve financial write safety"],
    partner_collapse: ["isolate partner queue partition", "shed non-critical events", "notify integration owner"],
    external_queue_saturation: ["apply backpressure", "reserve core commerce workers", "drain replay queue by tenant"],
  } as const;

  return {
    mode,
    platformTruthProtected: true,
    tenantIsolationProtected: true,
    recoverable: true,
    recoveryActions: actions[mode],
  };
}
