import type { GlobalRealtimePlan, GlobalRegion, RegionHealthSignal } from "./types";
import { resolveGlobalRegion } from "./orchestration";

export function planGlobalRealtime(input: {
  tenantId?: string | null;
  channel: string;
  preferredRegion?: GlobalRegion;
  health?: RegionHealthSignal[];
  eventRatePerSecond: number;
  duplicateRate: number;
}): GlobalRealtimePlan {
  const decision = resolveGlobalRegion({
    request: {
      preferredRegion: input.preferredRegion,
      tenantId: input.tenantId,
      domain: "realtime",
      latencySensitive: true,
      consistencyRequired: false,
    },
    health: input.health,
  });
  const pressure = input.eventRatePerSecond / 500 + input.duplicateRate;
  const floodProtection = pressure > 1.4 ? "shed_low_priority" : pressure > 0.9 || decision.degraded ? "batch" : "normal";

  return {
    primaryRegion: decision.region,
    fanoutRegions: decision.fallbackRegions.slice(0, decision.degraded ? 1 : 2),
    throttleInvalidations: decision.degraded || pressure > 1,
    replayRecovery: input.duplicateRate > 0.1 || !decision.replaySafe,
    consistencyWindowMs: decision.degraded ? 5_000 : 1_500,
    channelPartition: `${decision.region}:${input.tenantId ?? "public"}:${input.channel}`,
    floodProtection,
    observabilityTags: [
      `geo.realtime.primary.${decision.region}`,
      floodProtection === "normal" ? "geo.realtime.normal" : `geo.realtime.${floodProtection}`,
      input.duplicateRate > 0.1 ? "geo.realtime.duplicates" : "geo.realtime.replay_clean",
    ],
  };
}

export function geoRealtimeBackoff(input: { eventRatePerSecond: number; regionalPressure: number; duplicateRate: number }) {
  const pressure = Math.max(input.regionalPressure, input.eventRatePerSecond / 750, input.duplicateRate * 2);
  return {
    pressure: Number(pressure.toFixed(3)),
    batchWindowMs: pressure > 1 ? 2_500 : pressure > 0.7 ? 1_500 : 900,
    dropDuplicateWindowMs: pressure > 0.7 ? 120_000 : 60_000,
    shedLowPriority: pressure > 1.2,
  };
}

export function planRealtimeReconnectRecovery(input: {
  region: GlobalRegion;
  reconnects: number;
  activeSubscriptions: number;
  duplicateRate: number;
}) {
  const pressure = Math.max(input.reconnects / 250, input.activeSubscriptions / 10_000, input.duplicateRate * 3);

  return {
    region: input.region,
    stable: pressure < 0.75,
    pressure: Number(pressure.toFixed(3)),
    reconnectWindowMs: pressure > 1 ? 10_000 : pressure > 0.75 ? 5_000 : 2_000,
    maxFanoutRegions: pressure > 1 ? 1 : 2,
    recoveryActions:
      pressure > 1
        ? ["pin reconnects to primary region", "shed low-priority subscription fanout", "dedupe replayed realtime cursors"]
        : ["allow regional reconnects with jitter", "preserve channel cursor replay diagnostics"],
  };
}
