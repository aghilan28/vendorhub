import { evaluateOperationalAlerts } from "@/lib/observability/alerts";
import { createAsyncSupabaseClient } from "@/lib/async/supabase-unsafe";

type LogisticsHealthRow = {
  active_deliveries: number;
  stuck_deliveries: number;
  open_sla_breaches: number;
  recovery_backlog: number;
  provider_sync_failures: number;
  recent_tracking_events: number;
  tracking_replay_events: number;
  tracking_inconsistencies: number;
  provider_retry_pressure: number;
  critical_sla_breaches: number;
  unhealthy_providers: number;
  generated_at: string;
};

type LiveLogisticsHealthRow = {
  dispatch_backlog: number;
  deferred_dispatches: number;
  unhealthy_providers: number;
  provider_failovers_last_hour: number;
  max_zone_pressure: number;
  critical_pressure_events: number;
  critical_sla_breaches: number;
  routing_imbalances: number;
  generated_at: string;
};

export async function getLogisticsOperationalHealth() {
  const supabase = createAsyncSupabaseClient();
  const [{ data, error }, { data: liveData }] = await Promise.all([
    supabase.from("logistics_operational_health").select("*").maybeSingle(),
    supabase.from("live_logistics_network_health").select("*").maybeSingle(),
  ]);
  const row = (data ?? {}) as Partial<LogisticsHealthRow>;
  const live = (liveData ?? {}) as Partial<LiveLogisticsHealthRow>;
  const snapshot = {
    generatedAt: row.generated_at ?? new Date().toISOString(),
    activeDeliveries: Number(row.active_deliveries ?? 0),
    stuckDeliveries: Number(row.stuck_deliveries ?? 0),
    openSlaBreaches: Number(row.open_sla_breaches ?? 0),
    recoveryBacklog: Number(row.recovery_backlog ?? 0),
    providerSyncFailures: Number(row.provider_sync_failures ?? 0),
    recentTrackingEvents: Number(row.recent_tracking_events ?? 0),
    trackingReplayEvents: Number(row.tracking_replay_events ?? 0),
    trackingInconsistencies: Number(row.tracking_inconsistencies ?? 0),
    providerRetryPressure: Number(row.provider_retry_pressure ?? 0),
    criticalSlaBreaches: Number(row.critical_sla_breaches ?? 0),
    unhealthyProviders: Number(row.unhealthy_providers ?? 0),
    liveNetwork: {
      dispatchBacklog: Number(live.dispatch_backlog ?? 0),
      deferredDispatches: Number(live.deferred_dispatches ?? 0),
      unhealthyProviders: Number(live.unhealthy_providers ?? row.unhealthy_providers ?? 0),
      providerFailoversLastHour: Number(live.provider_failovers_last_hour ?? 0),
      maxZonePressure: Number(live.max_zone_pressure ?? 0),
      criticalPressureEvents: Number(live.critical_pressure_events ?? 0),
      criticalSlaBreaches: Number(live.critical_sla_breaches ?? row.critical_sla_breaches ?? 0),
      routingImbalances: Number(live.routing_imbalances ?? 0),
    },
    degraded:
      Boolean(error) ||
      Number(row.stuck_deliveries ?? 0) > 0 ||
      Number(row.open_sla_breaches ?? 0) > 5 ||
      Number(row.critical_sla_breaches ?? 0) > 0 ||
      Number(row.tracking_inconsistencies ?? 0) > 0 ||
      Number(row.provider_retry_pressure ?? 0) > 10 ||
      Number(row.unhealthy_providers ?? 0) > 0 ||
      Number(live.dispatch_backlog ?? 0) > 100 ||
      Number(live.max_zone_pressure ?? 0) > 0.85 ||
      Number(live.provider_failovers_last_hour ?? 0) > 5 ||
      Number(live.routing_imbalances ?? 0) > 0,
  };

  return {
    ...snapshot,
    alerts: evaluateOperationalAlerts({
      checkoutFailureRate: 0,
      paymentMismatchCount: 0,
      webhookRetryCount: 0,
      openIntegrityAlerts: 0,
      realtimeReconnects: 0,
      activeRealtimeChannels: 0,
      aiFallbackRate: 0,
      staleEmbeddingCount: 0,
      dbFailedWrites: error ? 1 : 0,
      authFailureCount: 0,
      refundOpenCount: 0,
      deliveryDelayedCount:
        snapshot.stuckDeliveries +
        snapshot.openSlaBreaches +
        snapshot.providerSyncFailures +
        snapshot.trackingInconsistencies +
        snapshot.providerRetryPressure +
        snapshot.liveNetwork.dispatchBacklog +
        snapshot.liveNetwork.deferredDispatches,
      moderationBacklog: 0,
      logisticsProviderOutageCount: snapshot.liveNetwork.unhealthyProviders,
      logisticsDispatchBacklog: snapshot.liveNetwork.dispatchBacklog,
      logisticsZonePressure: snapshot.liveNetwork.maxZonePressure,
      logisticsFailoverCount: snapshot.liveNetwork.providerFailoversLastHour,
      logisticsRoutingImbalance: snapshot.liveNetwork.routingImbalances,
    }),
  };
}
