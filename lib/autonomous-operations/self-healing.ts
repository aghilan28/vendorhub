import { globalReplayKey, planRegionalFailover, type RegionHealthSignal } from "@/lib/global-infrastructure";
import { aiRecoveryAction } from "@/lib/ai/recovery";
import { financialRecoveryActions } from "@/features/commerce-finance/financial-recovery";
import type { AutonomousFailoverPlan, AutonomousIncident, SelfHealingAction, SelfHealingPlan } from "./types";

function action(input: Omit<SelfHealingAction, "boundedRetries" | "cooldownSeconds" | "cooldownEnforced" | "reversible" | "replaySafe" | "retryTraceKey" | "rollbackValidation" | "requiresHumanApproval"> & Partial<Pick<SelfHealingAction, "boundedRetries" | "cooldownSeconds" | "cooldownEnforced" | "reversible" | "replaySafe" | "retryTraceKey" | "rollbackValidation" | "requiresHumanApproval">>): SelfHealingAction {
  const retryTraceKey = globalReplayKey(["autonomous-action", input.domain, input.id]);
  return {
    boundedRetries: input.boundedRetries ?? 3,
    cooldownSeconds: input.cooldownSeconds ?? 300,
    cooldownEnforced: input.cooldownEnforced ?? true,
    reversible: input.reversible ?? true,
    replaySafe: input.replaySafe ?? true,
    retryTraceKey: input.retryTraceKey ?? retryTraceKey,
    rollbackValidation: input.rollbackValidation ?? [
      "verify no duplicate replay cursor was consumed",
      "verify previous routing and retry budget can be restored",
      "emit deterministic remediation trace before retry",
    ],
    requiresHumanApproval: input.requiresHumanApproval ?? false,
    id: input.id,
    domain: input.domain,
    mode: input.mode,
    description: input.description,
  };
}

export function planSelfHealing(incident: AutonomousIncident): SelfHealingPlan {
  const critical = incident.severity === "critical";
  const baseTags = [`autonomous.domain.${incident.domain}`, `autonomous.severity.${incident.severity}`];
  const actions: SelfHealingAction[] = [];

  if (incident.domain === "async") {
    actions.push(action({ id: "async.throttle_producers", domain: "async", mode: "contain", description: "Throttle retry-heavy producers and reserve workers for critical queues.", cooldownSeconds: 180 }));
    actions.push(action({ id: "async.recover_infrastructure", domain: "async", mode: "heal", description: "Run async recovery sweep for stuck jobs, stale leases, and durable event backlog.", boundedRetries: 2, cooldownSeconds: 600 }));
  }
  if (incident.domain === "global") {
    actions.push(action({ id: "global.pin_routing", domain: "global", mode: "contain", description: "Pin traffic away from unstable regions until failover cooldown expires.", cooldownSeconds: 900 }));
    actions.push(action({ id: "global.validate_failback", domain: "global", mode: "heal", description: "Validate replay, cache, and observability cursors before failback.", boundedRetries: 1, cooldownSeconds: 900 }));
  }
  if (incident.domain === "edge") {
    actions.push(action({ id: "edge.bypass_corrupt_versions", domain: "edge", mode: "contain", description: "Serve stale-while-revalidate and replay accepted invalidations only.", cooldownSeconds: 240 }));
  }
  if (incident.domain === "realtime") {
    actions.push(action({ id: "realtime.stabilize_reconnects", domain: "realtime", mode: "contain", description: "Batch reconnects, reduce fanout regions, and dedupe event cursors.", cooldownSeconds: 180 }));
  }
  if (incident.domain === "ai") {
    actions.push(...aiRecoveryAction("queue_saturation").map((description, index) => action({ id: `ai.recovery.${index}`, domain: "ai", mode: "heal", description, cooldownSeconds: 420 })));
  }
  if (incident.domain === "finance") {
    actions.push(...financialRecoveryActions("reconciliation_backlog_explosion").map((description, index) => action({ id: `finance.recovery.${index}`, domain: "finance", mode: "heal", description, cooldownSeconds: 600, requiresHumanApproval: description.includes("payout") })));
  }
  if (incident.domain === "logistics") {
    actions.push(action({ id: "logistics.provider_failover", domain: "logistics", mode: "heal", description: "Run provider failover with cooldown and preserve seller-self fallback capacity.", cooldownSeconds: 600 }));
  }
  if (incident.domain === "governance") {
    actions.push(action({ id: "governance.freeze_unsafe_automation", domain: "governance", mode: critical ? "escalate" : "contain", description: "Freeze unsafe autonomous actions and replay tenant-scoped audit events.", cooldownSeconds: 900, requiresHumanApproval: critical }));
  }
  if (incident.domain === "developer_platform") {
    actions.push(action({ id: "platform.pause_webhook_fanout", domain: "developer_platform", mode: "contain", description: "Pause unstable webhook endpoints and drain dead-letter deliveries by replay key.", cooldownSeconds: 300 }));
  }
  if (incident.domain === "observability") {
    actions.push(action({ id: "observability.rebuild_projection", domain: "observability", mode: "heal", description: "Rebuild global health projection from regional and subsystem truth.", boundedRetries: 2, cooldownSeconds: 480 }));
  }

  const boundedRetryBudget = Math.min(
    critical ? 2 : 4,
    actions.reduce((total, item) => total + item.boundedRetries, 0),
  );
  const cooldownSeconds = Math.max(incident.escalationCooldownSeconds, ...actions.map((item) => item.cooldownSeconds), 0);
  const detectedAt = Date.parse(incident.detectedAt);
  const cooldownUntil = new Date((Number.isFinite(detectedAt) ? detectedAt : Date.now()) + cooldownSeconds * 1000).toISOString();
  const deterministicTrace = globalReplayKey(["autonomous-plan", incident.id, boundedRetryBudget, cooldownSeconds]);

  return {
    incidentId: incident.id,
    severity: incident.severity,
    mode: critical ? "escalate" : actions.some((item) => item.mode === "heal") ? "heal" : "contain",
    actions,
    rollbackActions: ["stop autonomous remediation loop", "restore previous routing and retry budgets", "preserve incident evidence for audit"],
    containmentActive: actions.some((item) => item.mode === "contain" || item.mode === "escalate"),
    escalationRequired: critical || actions.some((item) => item.requiresHumanApproval),
    replayTraceKey: globalReplayKey(["autonomous-healing", incident.id, incident.suppressionKey]),
    deterministicTrace,
    boundedRetryBudget,
    cooldownUntil,
    explainability: [
      incident.explainability.summary,
      `cooldown enforced until ${cooldownUntil}`,
      `bounded retry budget ${boundedRetryBudget}`,
      incident.replayAware ? "replay diagnostics must pass before recovery drain" : "no replay amplification evidence in source incident",
    ],
    observabilityTags: [...baseTags, incident.replayAware ? "autonomous.replay_aware" : "autonomous.no_replay"],
  };
}

export function planAutonomousFailover(input: {
  failedRegion: "bom1" | "sin1" | "fra1" | "iad1";
  health: RegionHealthSignal[];
  recentFailoverFlaps: number;
}): AutonomousFailoverPlan {
  const failover = planRegionalFailover({ failedRegion: input.failedRegion, health: input.health });
  const stable = input.recentFailoverFlaps <= 1 && failover.failedRegion !== failover.targetRegion;
  const oscillationPrevented = input.recentFailoverFlaps > 1;

  return {
    stable,
    targetRegion: failover.targetRegion,
    isolationRequired: !stable || failover.trafficMode === "read_only",
    cooldownSeconds: stable ? 600 : 1200,
    replayTraceKey: failover.recoveryCursor,
    failbackAllowed: failover.failbackAllowed && stable,
    oscillationPrevented,
    recoveryValidation: [
      "replay cursor validated before failback",
      "observability projection rebuilt from regional truth",
      "regional writes remain frozen until stability window completes",
    ],
    actions: stable
      ? [...failover.actions, "hold failback until cooldown and replay validation pass"]
      : ["freeze failover automation", "pin routing to last healthy target", "escalate failover instability"],
  };
}
