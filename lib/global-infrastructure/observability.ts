import type { CacheInvalidationEvent, GeoReplayDiagnostics, GlobalCompatibilityReport, GlobalInfrastructureLoadInput, GlobalInfrastructureValidationReport, GlobalRegion, RegionHealthSignal } from "./types";

export function regionalHealthTone(signal: RegionHealthSignal) {
  if (signal.state === "OUTAGE" || signal.cacheInconsistency > 10 || signal.observabilityLagSeconds > 300) return "critical";
  if (signal.state !== "HEALTHY" || signal.saturation > 0.75 || signal.queuePressure > 0.75 || signal.realtimePressure > 0.8 || signal.replayBacklog > 500) return "watch";
  return "healthy";
}

export function diagnoseGlobalReplay(input: {
  events: Array<{ replayKey: string; region: GlobalRegion; sequence: number }>;
  maxRegionalSkew?: number;
}): GeoReplayDiagnostics {
  const seen = new Set<string>();
  const duplicateKeys = new Set<string>();
  const safeReplayKeys: string[] = [];
  const sequenceByRegion = input.events.reduce<Partial<Record<GlobalRegion, number[]>>>((current, event) => {
    current[event.region] = [...(current[event.region] ?? []), event.sequence];
    if (seen.has(event.replayKey)) {
      duplicateKeys.add(event.replayKey);
    } else {
      seen.add(event.replayKey);
      safeReplayKeys.push(event.replayKey);
    }
    return current;
  }, {});
  const regionalSkew = Object.fromEntries(
    Object.entries(sequenceByRegion).map(([region, values]) => [region, Math.max(...values) - Math.min(...values)]),
  ) as Partial<Record<GlobalRegion, number>>;
  const maxSkew = Math.max(0, ...Object.values(regionalSkew));
  const stormDetected = duplicateKeys.size > 0 || maxSkew > (input.maxRegionalSkew ?? 500);

  return {
    replaySafe: !stormDetected,
    duplicateCount: duplicateKeys.size,
    regionalSkew,
    stormDetected,
    safeReplayKeys,
    quarantineKeys: [...duplicateKeys],
    actions: stormDetected
      ? ["quarantine duplicate replay keys", "resume regional queues from accepted cursors", "emit cross-region replay alert"]
      : ["continue regional replay"],
  };
}

export function validateGlobalCompatibility(input: {
  aiReplayAnomalies: number;
  financeReplayFrequency: number;
  governanceReplayAnomalies: number;
  logisticsFailovers: number;
  regionalCoverage: Partial<Record<"ai" | "finance" | "governance" | "logistics", GlobalRegion[]>>;
}): GlobalCompatibilityReport {
  const domainNames = ["ai", "finance", "governance", "logistics"] as const;
  const domains = Object.fromEntries(
    domainNames.map((domain) => {
      const coverage = input.regionalCoverage[domain] ?? [];
      const replaySafe =
        domain === "ai"
          ? input.aiReplayAnomalies === 0
          : domain === "finance"
            ? input.financeReplayFrequency <= 0.04
            : domain === "governance"
              ? input.governanceReplayAnomalies === 0
              : input.logisticsFailovers <= 10;

      return [
        domain,
        {
          regionAware: coverage.length >= 2,
          replaySafe,
          observabilityReady: coverage.length > 0,
          actions: coverage.length >= 2 && replaySafe
            ? [`keep ${domain} regional orchestration active`]
            : [`verify ${domain} regional coverage`, `replay-safe ${domain} recovery before failback`],
        },
      ];
    }),
  ) as GlobalCompatibilityReport["domains"];

  return {
    compatible: Object.values(domains).every((domain) => domain.regionAware && domain.replaySafe && domain.observabilityReady),
    domains,
  };
}

export function cacheInvalidationBacklog(events: CacheInvalidationEvent[]) {
  return events.reduce<Partial<Record<GlobalRegion, number>>>((current, event) => {
    current[event.region] = (current[event.region] ?? 0) + 1;
    return current;
  }, {});
}

export function evaluateGlobalLoad(input: GlobalInfrastructureLoadInput) {
  const activeRegions = Math.max(1, input.activeRegions);
  const trafficPressure = input.crossRegionTraffic / (activeRegions * 1200);
  const edgePressure = input.edgeInvalidations / (activeRegions * 800);
  const realtimePressure = input.realtimeEvents / (activeRegions * 1500);
  const queuePressure = input.queueBacklog / (activeRegions * 700);
  const aiPressure = input.aiRegionalLoad / (activeRegions * 500);
  const financePressure = input.financeReconciliationEvents / (activeRegions * 350);
  const outagePressure = input.regionalOutages / activeRegions;
  const pressure = Math.max(trafficPressure, edgePressure, realtimePressure, queuePressure, aiPressure, financePressure, outagePressure);

  return {
    pressure,
    safe: pressure <= 1.15 && input.regionalOutages < activeRegions,
    latencyOptimized: trafficPressure <= 0.9 && realtimePressure <= 0.95,
    gracefulDegradation:
      pressure > 1.15
        ? ["route traffic to healthiest capable region", "batch edge invalidations", "throttle cross-region realtime fanout", "shed non-critical analytics and AI recomputation"]
        : [],
  };
}

export function validateGlobalInfrastructure(input: {
  regions: RegionHealthSignal[];
  load: GlobalInfrastructureLoadInput;
  replayAnomalies: number;
  edgeBacklog: number;
  crossRegionDesync: number;
}, now = new Date()): GlobalInfrastructureValidationReport {
  const risks: string[] = [];
  const load = evaluateGlobalLoad(input.load);
  const regionalObservabilityReady = input.regions.every((region) => region.observabilityLagSeconds <= 180);
  const recoveryDeterministic = input.regions.every((region) => region.state !== "OUTAGE" || region.replayBacklog < 1_000);

  if (input.regions.some((region) => region.state === "OUTAGE")) risks.push("regional_outage");
  if (input.regions.some((region) => region.queuePressure > 0.9)) risks.push("regional_queue_saturation");
  if (input.regions.some((region) => region.realtimePressure > 0.9)) risks.push("realtime_geo_instability");
  if (input.regions.some((region) => region.cacheInconsistency > 5) || input.edgeBacklog > 500) risks.push("edge_cache_consistency");
  if (input.regions.some((region) => region.observabilityLagSeconds > 180)) risks.push("observability_fragmentation");
  if (input.replayAnomalies > 0 || input.crossRegionDesync > 0) risks.push("cross_region_replay_or_desync");
  if (!load.safe) risks.push("global_saturation");

  return {
    productionSafe: risks.length === 0,
    checkedAt: now.toISOString(),
    risks: [...new Set(risks)],
    gracefulDegradation: [...new Set(load.gracefulDegradation)],
    latencyOptimized: load.latencyOptimized,
    replaySafe: input.replayAnomalies === 0 && input.crossRegionDesync === 0,
    regionalObservabilityReady,
    recoveryDeterministic,
  };
}
