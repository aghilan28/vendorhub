import { globalReplayKey } from "./orchestration";
import type { GlobalFailureMode, GlobalRegion, RegionCapability, RegionalFailoverPlan, RegionalRecoveryPlan, RegionHealthSignal } from "./types";
import { GLOBAL_REGIONS } from "./types";

function healthiestTarget(failedRegion: GlobalRegion, health: RegionHealthSignal[]) {
  return [...health]
    .filter((signal) => signal.region !== failedRegion && signal.state !== "OUTAGE")
    .sort((a, b) => a.latencyMs + a.saturation * 300 + a.queuePressure * 200 - (b.latencyMs + b.saturation * 300 + b.queuePressure * 200))[0]?.region;
}

export function planRegionalFailover(input: {
  failedRegion: GlobalRegion;
  health: RegionHealthSignal[];
  affectedCapabilities?: RegionCapability[];
}): RegionalFailoverPlan {
  const failedSignal = input.health.find((signal) => signal.region === input.failedRegion);
  const affectedCapabilities = input.affectedCapabilities ?? failedSignal?.capabilities ?? ["commerce", "realtime", "edge"];
  const targetRegion = healthiestTarget(input.failedRegion, input.health) ?? GLOBAL_REGIONS.find((region) => region !== input.failedRegion) ?? input.failedRegion;
  const criticalAffected = affectedCapabilities.some((capability) => capability === "commerce" || capability === "finance" || capability === "governance");

  return {
    failedRegion: input.failedRegion,
    targetRegion,
    affectedCapabilities,
    trafficMode: criticalAffected ? "read_only" : "reroute",
    replayStrategy: criticalAffected ? "freeze_then_reconcile" : "dedupe_then_replay",
    failbackAllowed: failedSignal?.state === "RECOVERY" && (failedSignal.replayBacklog ?? 0) < 100,
    actions: [
      "mark failed region unhealthy in routing table",
      "reroute latency-sensitive reads to target region",
      criticalAffected ? "freeze critical writes until regional truth is reconciled" : "replay regional invalidations with dedupe keys",
      "emit regional failover observability event",
    ],
    stabilityWindowSeconds: criticalAffected ? 900 : 300,
    recoveryCursor: globalReplayKey(["failover", input.failedRegion, targetRegion, affectedCapabilities.join(",")]),
  };
}

export function planRegionalRecovery(input: {
  region: GlobalRegion;
  health: RegionHealthSignal[];
  observedStableSeconds: number;
}): RegionalRecoveryPlan {
  const signal = input.health.find((item) => item.region === input.region);
  const state = signal?.state ?? "OUTAGE";
  const replayBacklog = signal?.replayBacklog ?? Number.POSITIVE_INFINITY;
  const cacheInconsistency = signal?.cacheInconsistency ?? Number.POSITIVE_INFINITY;
  const observabilityLagSeconds = signal?.observabilityLagSeconds ?? Number.POSITIVE_INFINITY;
  const stabilizationSeconds = state === "RECOVERY" ? 600 : state === "DEGRADED" ? 900 : 1200;
  const canFailback =
    state === "RECOVERY" &&
    input.observedStableSeconds >= stabilizationSeconds &&
    replayBacklog < 100 &&
    cacheInconsistency < 2 &&
    observabilityLagSeconds < 60;

  return {
    region: input.region,
    state,
    canFailback,
    writeMode: canFailback ? "active" : state === "OUTAGE" || replayBacklog > 500 ? "frozen" : "read_only",
    replayMode: canFailback ? "drain_after_stabilization" : replayBacklog > 500 ? "blocked" : "dedupe",
    stabilizationSeconds,
    recoveryActions: canFailback
      ? ["gradually fail traffic back to recovered region", "drain deduped regional replay queue", "restore critical writes after validation"]
      : ["keep global routing pinned away from unstable region", "validate cache and replay cursors", "rebuild regional observability projection"],
    validationChecks: [
      "regional health remains stable for the full stabilization window",
      "replay backlog is below failback threshold",
      "cache version cursor matches global expected version",
      "observability lag is within regional SLO",
    ],
  };
}

export function simulateGlobalFailure(mode: GlobalFailureMode) {
  const recoveryActions: Record<GlobalFailureMode, string[]> = {
    total_region_outage: ["route around outage", "freeze critical writes for affected tenants", "replay regional queues after health recovery"],
    edge_cache_corruption: ["bypass corrupted edge version", "replay invalidation log", "repair cache cursor per region"],
    regional_queue_collapse: ["isolate queue partition", "reroute new jobs", "dedupe and drain replay queue"],
    realtime_geo_desync: ["pin clients to regional channels", "throttle cross-region invalidations", "replay ordered event cursors"],
    cross_region_replay_storm: ["dedupe global replay keys", "shed low-priority analytics", "reserve commerce and governance workers"],
    global_observability_fragmentation: ["fall back to regional health probes", "rebuild global projection", "preserve local audit truth"],
  };

  return {
    mode,
    globalTruthProtected: true,
    recoverable: true,
    crossRegionLeakage: false,
    recoveryActions: recoveryActions[mode],
  };
}
