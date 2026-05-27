import { createHash } from "crypto";
import { policyForJob } from "@/lib/async/policies";
import type { AsyncJobName } from "@/lib/async/types";
import type {
  GeoAsyncRoutingDecision,
  GeoRoutingDecision,
  GeoRoutingRequest,
  GlobalRegion,
  RegionCapability,
  RegionHealthSignal,
} from "./types";
import { GLOBAL_REGIONS } from "./types";

const regionHints: Record<string, GlobalRegion> = {
  in: "bom1",
  india: "bom1",
  south_asia: "bom1",
  sea: "sin1",
  singapore: "sin1",
  europe: "fra1",
  eu: "fra1",
  us: "iad1",
  north_america: "iad1",
};

function stableHash(parts: Array<string | number | boolean | null | undefined>) {
  return createHash("sha256").update(parts.map((part) => String(part ?? "none")).join(":")).digest("hex");
}

function capabilityForDomain(domain: GeoRoutingRequest["domain"]): RegionCapability {
  if (domain === "commerce") return "commerce";
  if (domain === "notification") return "commerce";
  if (domain === "logistics") return "logistics";
  if (domain === "governance") return "governance";
  if (domain === "analytics") return "analytics";
  if (domain === "realtime") return "realtime";
  if (domain === "ai") return "ai";
  return domain as RegionCapability;
}

function defaultRegionHealth(): RegionHealthSignal[] {
  return GLOBAL_REGIONS.map((region) => ({
    region,
    state: "HEALTHY",
    latencyMs: region === "bom1" ? 80 : region === "sin1" ? 130 : 210,
    saturation: 0.2,
    queuePressure: 0.1,
    realtimePressure: 0.1,
    cacheInconsistency: 0,
    replayBacklog: 0,
    observabilityLagSeconds: 5,
    capabilities: ["commerce", "logistics", "ai", "finance", "governance", "analytics", "realtime", "edge"],
  }));
}

function preferredRegionFor(request: GeoRoutingRequest) {
  if (request.preferredRegion) return request.preferredRegion;
  const hint = request.userRegionHint?.toLowerCase();
  if (hint && regionHints[hint]) return regionHints[hint];
  if (request.tenantId) {
    const index = Number.parseInt(stableHash([request.tenantId]).slice(0, 8), 16) % GLOBAL_REGIONS.length;
    return GLOBAL_REGIONS[index];
  }
  return "bom1";
}

function scoreRegion(signal: RegionHealthSignal, capability: RegionCapability, preferred: GlobalRegion, request: GeoRoutingRequest) {
  if (!signal.capabilities.includes(capability)) return Number.POSITIVE_INFINITY;
  if (signal.state === "OUTAGE") return Number.POSITIVE_INFINITY;

  const preferredPenalty = signal.region === preferred ? 0 : 80;
  const statePenalty = signal.state === "DEGRADED" ? 180 : signal.state === "RECOVERY" ? 120 : 0;
  const saturationPenalty = signal.saturation * 300;
  const queuePenalty = signal.queuePressure * 180;
  const realtimePenalty = capability === "realtime" ? signal.realtimePressure * 250 : signal.realtimePressure * 80;
  const consistencyPenalty = request.consistencyRequired ? signal.cacheInconsistency * 400 + signal.replayBacklog * 2 : signal.cacheInconsistency * 100;
  return signal.latencyMs + preferredPenalty + statePenalty + saturationPenalty + queuePenalty + realtimePenalty + consistencyPenalty;
}

export function resolveGlobalRegion(input: {
  request: GeoRoutingRequest;
  health?: RegionHealthSignal[];
}): GeoRoutingDecision {
  const health = input.health?.length ? input.health : defaultRegionHealth();
  const capability = capabilityForDomain(input.request.domain);
  const preferred = preferredRegionFor(input.request);
  const ranked = [...health]
    .map((signal) => ({ signal, score: scoreRegion(signal, capability, preferred, input.request) }))
    .filter((item) => Number.isFinite(item.score))
    .sort((a, b) => a.score - b.score);
  const selected = ranked[0]?.signal;

  if (!selected) {
    return {
      region: preferred,
      fallbackRegions: GLOBAL_REGIONS.filter((region) => region !== preferred),
      degraded: true,
      consistencyMode: "read_only_degraded",
      reason: "no_healthy_capable_region",
      replaySafe: false,
      routingKey: globalReplayKey(["route", preferred, capability, "degraded"]),
      observabilityTags: ["geo.route.no_capable_region", `geo.preferred.${preferred}`, `geo.capability.${capability}`],
    };
  }

  const degraded = selected.state !== "HEALTHY" || selected.saturation > 0.8 || selected.queuePressure > 0.85;
  const consistencyMode = degraded
    ? input.request.consistencyRequired
      ? "read_only_degraded"
      : "global_eventual"
    : input.request.consistencyRequired
      ? "regional_strong"
      : "global_eventual";

  return {
    region: selected.region,
    fallbackRegions: ranked.slice(1).map((item) => item.signal.region),
    degraded,
    consistencyMode,
    reason: selected.region === preferred ? "preferred_region_healthy" : "preferred_region_degraded_or_far",
    replaySafe: selected.replayBacklog < 500 && selected.cacheInconsistency < 5,
    routingKey: globalReplayKey(["route", selected.region, preferred, capability, input.request.tenantId ?? "public"]),
    observabilityTags: [
      `geo.region.${selected.region}`,
      `geo.preferred.${preferred}`,
      `geo.capability.${capability}`,
      degraded ? "geo.routing.degraded" : "geo.routing.healthy",
      input.request.consistencyRequired ? "geo.consistency.required" : "geo.consistency.eventual",
    ],
  };
}

export function routeAsyncJobToRegion(input: {
  jobName: AsyncJobName;
  tenantId?: string | null;
  preferredRegion?: GlobalRegion;
  health?: RegionHealthSignal[];
}): GeoAsyncRoutingDecision {
  const policy = policyForJob(input.jobName);
  const decision = resolveGlobalRegion({
    request: {
      preferredRegion: input.preferredRegion,
      tenantId: input.tenantId,
      domain: policy.domain,
      latencySensitive: policy.computeClass === "critical" || policy.computeClass === "interactive",
      consistencyRequired: policy.domain === "commerce" || policy.domain === "governance",
    },
    health: input.health,
  });

  return {
    ...decision,
    jobName: input.jobName,
    queueRegionKey: `${decision.region}:${policy.queueName}`,
  };
}

export function globalReplayKey(parts: Array<string | number | boolean | null | undefined>) {
  return stableHash(["global", ...parts]);
}
