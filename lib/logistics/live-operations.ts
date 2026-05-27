import { AppError } from "@/lib/errors";
import { recordOperationalEvent } from "@/lib/production/observability";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type UnsafeRpcClient = ReturnType<typeof createSupabaseAdminClient> & {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }>;
};

async function runLogisticsRpc(fn: string, args: Record<string, unknown>, eventName: string) {
  const supabase = createSupabaseAdminClient() as UnsafeRpcClient;
  const { data, error } = await supabase.rpc(fn, args);

  if (error) {
    recordOperationalEvent("error", `${eventName}.failed`, args, { domain: "delivery", error });
    throw new AppError("DATABASE_ERROR", `${eventName} failed.`, error);
  }

  recordOperationalEvent("info", `${eventName}.completed`, { result: "[object]" }, { domain: "delivery" });
  return data;
}

export function runDispatchIntelligenceSystem(batchSize = 100, zoneId?: string | null) {
  return runLogisticsRpc("run_live_dispatch_intelligence", { batch_size: batchSize, target_zone_id: zoneId ?? null }, "delivery.dispatch_intelligence");
}

export function runProviderFailoverSystem(provider?: string | null, reason = "provider_health_recheck") {
  return runLogisticsRpc("run_logistics_provider_failover", { target_provider: provider ?? null, failover_reason: reason }, "delivery.provider_failover");
}

export function runRoutingRefreshSystem(zoneId?: string | null, batchSize = 100) {
  return runLogisticsRpc("refresh_logistics_routing_intelligence", { target_zone_id: zoneId ?? null, batch_size: batchSize }, "delivery.routing_refresh");
}

export function runDynamicSlaEnforcementSystem(batchSize = 100) {
  return runLogisticsRpc("run_dynamic_delivery_sla_enforcement", { batch_size: batchSize }, "delivery.dynamic_sla");
}

export function runCongestionAnalysisSystem(zoneId?: string | null) {
  return runLogisticsRpc("analyze_delivery_congestion", { target_zone_id: zoneId ?? null }, "delivery.congestion_analysis");
}
