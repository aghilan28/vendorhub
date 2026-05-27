"use client";

import type { QueryClient } from "@tanstack/react-query";
import type { RealtimeChannel, RealtimePostgresChangesPayload, SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  acquireRealtimeLeaderLease,
  getRealtimeLeaderTabId,
  getRealtimeTabId,
  isRealtimeLeader,
  publishMarketplaceRealtimeEvent,
  releaseRealtimeLeaderLease,
  subscribeMarketplaceRealtimeEvents,
} from "@/lib/realtime/event-bus";
import {
  cartEventFromRow,
  deliveryTrackingEventFromRow,
  inventoryEventFromRow,
  notificationEventFromRow,
  orderEventFromRow,
  orderHistoryEventFromRow,
  payoutEventFromRow,
  wishlistEventFromRow,
} from "@/lib/realtime/mappers";
import type { Database, Tables } from "@/types/database";
import type { DeliveryTrackingRealtimeRow, MarketplaceRealtimeEvent, RealtimeConnectionState, RealtimeObservabilitySnapshot } from "./types";
import { recordOperationalEvent } from "@/lib/production/observability";
import { performanceBudgets } from "@/lib/performance/cache-policy";
import { createTenantEnvelope } from "@/lib/enterprise-governance/tenant-isolation";

type ChangePayload<T extends Record<string, unknown>> = RealtimePostgresChangesPayload<T>;
type Role = Database["public"]["Enums"]["app_role"];
type ChannelStatus = "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR";

export type RealtimeContext = {
  userId: string;
  roles: Role[];
  vendorIds: string[];
  organizationIds: string[];
  workspaceIds: string[];
  buyerOrderIds: string[];
  sellerOrderIds: string[];
  deliveryIds: string[];
};

export type ScopedRealtimeCallbacks = {
  onConnectionState: (state: RealtimeConnectionState) => void;
  onEvent: (event: MarketplaceRealtimeEvent) => void;
  onObservability: (snapshot: Partial<RealtimeObservabilitySnapshot>) => void;
};

function hasRow<T extends Record<string, unknown>>(payload: ChangePayload<T>): payload is ChangePayload<T> & { new: T } {
  return payload.eventType !== "DELETE" && Boolean(payload.new);
}

function csv(values: string[]) {
  return `in.(${values.join(",")})`;
}

function isAdmin(context: RealtimeContext) {
  return context.roles.includes("ADMIN") || context.roles.includes("SUPER_ADMIN");
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function estimateEventBytes(event: MarketplaceRealtimeEvent) {
  return JSON.stringify(event).length;
}

function eventVisibleToContext(event: MarketplaceRealtimeEvent, context: RealtimeContext) {
  if (event.recipientId && event.recipientId === context.userId) return true;
  if (event.vendorId && context.vendorIds.includes(event.vendorId)) return true;
  if (event.organizationId && context.organizationIds.length) return context.organizationIds.includes(event.organizationId);
  if (event.workspaceId && context.workspaceIds.length) return context.workspaceIds.includes(event.workspaceId);
  return isAdmin(context) && !event.organizationId && !event.workspaceId;
}

function attachTenantIsolation(event: MarketplaceRealtimeEvent, context: RealtimeContext): MarketplaceRealtimeEvent {
  const organizationId = event.organizationId ?? context.organizationIds[0] ?? null;
  const workspaceId = event.workspaceId ?? context.workspaceIds[0] ?? null;
  if (!organizationId) return event;

  const tenant = createTenantEnvelope({
    organizationId,
    workspaceId,
    vendorId: event.vendorId,
    actorId: context.userId,
  });

  return {
    ...event,
    organizationId: tenant.organizationId,
    workspaceId: tenant.workspaceId,
    tenantIsolationKey: tenant.isolationKey,
  };
}

class ThrottledInvalidator {
  private pending = new Set<string>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private count = 0;

  constructor(
    private readonly queryClient: QueryClient,
    private readonly onFlush: (count: number) => void,
  ) {}

  schedule(keys: string[]) {
    keys.forEach((key) => this.pending.add(key));
    if (this.timer) return;

    this.timer = setTimeout(() => {
      const keysToFlush = [...this.pending];
      this.pending.clear();
      this.timer = null;
      this.count += keysToFlush.length;
      this.onFlush(this.count);

      for (const key of keysToFlush) {
        void this.queryClient.invalidateQueries({ queryKey: [key] });
      }
    }, performanceBudgets.realtimeBatchWindowMs);
  }

  dispose() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.pending.clear();
  }
}

class RealtimeEventCoalescer {
  private seen = new Map<string, number>();
  private pending = new Map<string, MarketplaceRealtimeEvent>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private duplicateCount = 0;

  constructor(
    private readonly onFlush: (events: MarketplaceRealtimeEvent[], duplicateCount: number) => void,
  ) {}

  push(event: MarketplaceRealtimeEvent) {
    const now = Date.now();
    for (const [key, expiresAt] of this.seen) {
      if (expiresAt <= now) this.seen.delete(key);
    }

    if (this.seen.has(event.id)) {
      this.duplicateCount += 1;
      return;
    }

    this.seen.set(event.id, now + 60_000);
    this.pending.set(`${event.table}:${event.id}`, event);
    if (this.timer) return;

    this.timer = setTimeout(() => {
      const events = [...this.pending.values()].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      this.pending.clear();
      this.timer = null;
      this.onFlush(events, this.duplicateCount);
    }, 250);
  }

  dispose() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.pending.clear();
    this.seen.clear();
  }
}

async function loadRealtimeContext(supabase: SupabaseClient<Database>): Promise<RealtimeContext | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const [rolesResult, vendorMembersResult, buyerOrdersResult] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id).is("deleted_at", null),
    supabase.from("vendor_members").select("vendor_id").eq("user_id", user.id).is("deleted_at", null),
    supabase.from("orders").select("id").eq("buyer_id", user.id).is("deleted_at", null).order("updated_at", { ascending: false }).limit(100),
  ]);

  const vendorIds = unique((vendorMembersResult.data ?? []).map((row) => row.vendor_id));
  const buyerOrderIds = unique((buyerOrdersResult.data ?? []).map((row) => row.id));
  const sellerOrdersResult = vendorIds.length
    ? await supabase.from("orders").select("id, vendor_id").in("vendor_id", vendorIds).is("deleted_at", null).order("updated_at", { ascending: false }).limit(100)
    : { data: [] };
  const sellerOrderIds = unique((sellerOrdersResult.data ?? []).map((row) => row.id));

  const deliveryIds =
    buyerOrderIds.length || sellerOrderIds.length
      ? unique(
          (
            await supabase
              .from("deliveries")
              .select("id")
              .in("order_id", unique([...buyerOrderIds, ...sellerOrderIds]))
              .limit(150)
          ).data?.map((row) => row.id) ?? [],
      )
      : [];

  const adminOrderIds = isAdmin({
    userId: user.id,
    roles: ((rolesResult.data ?? []).map((row) => row.role) as Role[]).length ? ((rolesResult.data ?? []).map((row) => row.role) as Role[]) : ["BUYER"],
    vendorIds,
    organizationIds: [],
    workspaceIds: [],
    buyerOrderIds,
    sellerOrderIds,
    deliveryIds,
  })
    ? unique(
        (
          await supabase
            .from("orders")
            .select("id")
            .is("deleted_at", null)
            .order("updated_at", { ascending: false })
            .limit(150)
        ).data?.map((row) => row.id) ?? [],
      )
    : [];
  const adminVendorIds = isAdmin({
    userId: user.id,
    roles: ((rolesResult.data ?? []).map((row) => row.role) as Role[]).length ? ((rolesResult.data ?? []).map((row) => row.role) as Role[]) : ["BUYER"],
    vendorIds,
    organizationIds: [],
    workspaceIds: [],
    buyerOrderIds,
    sellerOrderIds,
    deliveryIds,
  })
    ? unique(
        (
          await supabase
            .from("vendors")
            .select("id")
            .is("deleted_at", null)
            .order("updated_at", { ascending: false })
            .limit(150)
        ).data?.map((row) => row.id) ?? [],
      )
    : [];

  return {
    userId: user.id,
    roles: ((rolesResult.data ?? []).map((row) => row.role) as Role[]).length ? ((rolesResult.data ?? []).map((row) => row.role) as Role[]) : ["BUYER"],
    vendorIds,
    organizationIds: [],
    workspaceIds: [],
    buyerOrderIds,
    sellerOrderIds: unique([...sellerOrderIds, ...adminOrderIds]),
    deliveryIds,
    ...(adminVendorIds.length ? { vendorIds: unique([...vendorIds, ...adminVendorIds]) } : {}),
  };
}

function observeStatus(status: ChannelStatus, callbacks: ScopedRealtimeCallbacks, activeChannels: number) {
  if (status === "SUBSCRIBED") {
    callbacks.onConnectionState("connected");
    callbacks.onObservability({
      activeChannels,
      leaderTabId: getRealtimeLeaderTabId(),
      passiveTabs: isRealtimeLeader() ? 0 : 1,
    });
  }

  if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
    callbacks.onConnectionState("degraded");
    callbacks.onObservability({ failedSubscriptions: 1, lastError: status });
    recordOperationalEvent("warn", "realtime.channel_error", { status, tabId: getRealtimeTabId(), activeChannels }, { domain: "realtime" });
  }

  if (status === "CLOSED") callbacks.onConnectionState("offline");
}

function routeInvalidation(event: MarketplaceRealtimeEvent) {
  if (event.table === "cart_items") return ["cart"];
  if (event.table === "wishlists") return ["products"];
  if (event.table === "notifications") return event.scope === "admin" ? ["admin"] : ["seller"];
  if (event.table === "inventory") return event.scope === "admin" ? ["admin"] : ["seller", "products"];
  if (event.table === "seller_payout_attributions") return event.scope === "admin" ? ["admin"] : ["seller"];
  if (event.table === "delivery_tracking_events") return ["orders"];
  if (event.scope === "seller") return ["orders", "seller"];
  if (event.scope === "admin") return ["admin"];
  return ["orders"];
}

function scopedChannel(supabase: SupabaseClient<Database>, name: string) {
  return supabase.channel(`vendorhub:${name}`, {
    config: { broadcast: { self: false }, presence: { key: name } },
  });
}

function buildLeaderSubscriptions(supabase: SupabaseClient<Database>, context: RealtimeContext, emit: (event: MarketplaceRealtimeEvent) => void, addChannel: (channel: RealtimeChannel) => void) {
  const emitScoped = (event: MarketplaceRealtimeEvent) => {
    const scopedEvent = attachTenantIsolation(event, context);
    if (!eventVisibleToContext(scopedEvent, context)) {
      recordOperationalEvent("warn", "realtime.tenant_event_blocked", {
        table: scopedEvent.table,
        scope: scopedEvent.scope,
        organizationId: scopedEvent.organizationId,
        workspaceId: scopedEvent.workspaceId,
        vendorId: scopedEvent.vendorId,
      }, { domain: "realtime", subjectId: scopedEvent.id });
      return;
    }
    emit(scopedEvent);
  };

  addChannel(
    scopedChannel(supabase, `buyer:${context.userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: `buyer_id=eq.${context.userId}` }, (payload: ChangePayload<Tables<"orders">>) => {
        if (hasRow(payload)) emitScoped(orderEventFromRow(payload.new, "INSERT"));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `buyer_id=eq.${context.userId}` }, (payload: ChangePayload<Tables<"orders">>) => {
        if (hasRow(payload)) emitScoped(orderEventFromRow(payload.new, "UPDATE"));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${context.userId}` }, (payload: ChangePayload<Tables<"notifications">>) => {
        if (hasRow(payload)) emitScoped(notificationEventFromRow(payload.new, "INSERT"));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `recipient_id=eq.${context.userId}` }, (payload: ChangePayload<Tables<"notifications">>) => {
        if (hasRow(payload)) emitScoped(notificationEventFromRow(payload.new, "UPDATE"));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "cart_items", filter: `user_id=eq.${context.userId}` }, (payload: ChangePayload<Tables<"cart_items">>) => {
        if (hasRow(payload)) emitScoped(cartEventFromRow(payload.new));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "cart_items", filter: `user_id=eq.${context.userId}` }, (payload: ChangePayload<Tables<"cart_items">>) => {
        if (hasRow(payload)) emitScoped(cartEventFromRow(payload.new));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "wishlists", filter: `user_id=eq.${context.userId}` }, (payload: ChangePayload<Tables<"wishlists">>) => {
        if (hasRow(payload)) emitScoped(wishlistEventFromRow(payload.new));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "wishlists", filter: `user_id=eq.${context.userId}` }, (payload: ChangePayload<Tables<"wishlists">>) => {
        if (hasRow(payload)) emitScoped(wishlistEventFromRow(payload.new));
      }),
  );

  if (context.buyerOrderIds.length) {
    addChannel(
      scopedChannel(supabase, `buyer-orders:${context.userId}`).on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_status_history", filter: `order_id=${csv(context.buyerOrderIds)}` },
        (payload: ChangePayload<Tables<"order_status_history">>) => {
          if (hasRow(payload)) emitScoped(orderHistoryEventFromRow(payload.new));
        },
      ),
    );
  }

  if (context.deliveryIds.length) {
    addChannel(
      scopedChannel(supabase, `delivery:${context.userId}`).on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "delivery_tracking_events", filter: `delivery_id=${csv(context.deliveryIds)}` },
        (payload: ChangePayload<DeliveryTrackingRealtimeRow>) => {
          if (hasRow(payload)) emitScoped(deliveryTrackingEventFromRow(payload.new));
        },
      ),
    );
  }

  for (const vendorId of context.vendorIds) {
    addChannel(
      scopedChannel(supabase, `seller:${vendorId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: `vendor_id=eq.${vendorId}` }, (payload: ChangePayload<Tables<"orders">>) => {
          if (hasRow(payload)) emitScoped({ ...orderEventFromRow(payload.new, "INSERT"), scope: "seller" });
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `vendor_id=eq.${vendorId}` }, (payload: ChangePayload<Tables<"orders">>) => {
          if (hasRow(payload)) emitScoped({ ...orderEventFromRow(payload.new, "UPDATE"), scope: "seller" });
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "inventory", filter: `vendor_id=eq.${vendorId}` }, (payload: ChangePayload<Tables<"inventory">>) => {
          if (hasRow(payload)) emitScoped(inventoryEventFromRow(payload.new));
        })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `vendor_id=eq.${vendorId}` }, (payload: ChangePayload<Tables<"notifications">>) => {
          if (hasRow(payload)) emitScoped(notificationEventFromRow(payload.new, "INSERT"));
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `vendor_id=eq.${vendorId}` }, (payload: ChangePayload<Tables<"notifications">>) => {
          if (hasRow(payload)) emitScoped(notificationEventFromRow(payload.new, "UPDATE"));
        })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "seller_payout_attributions", filter: `vendor_id=eq.${vendorId}` }, (payload: ChangePayload<Tables<"seller_payout_attributions">>) => {
          if (hasRow(payload)) emitScoped(payoutEventFromRow(payload.new));
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "seller_payout_attributions", filter: `vendor_id=eq.${vendorId}` }, (payload: ChangePayload<Tables<"seller_payout_attributions">>) => {
          if (hasRow(payload)) emitScoped(payoutEventFromRow(payload.new));
        }),
    );
  }

  if (context.sellerOrderIds.length) {
    addChannel(
      scopedChannel(supabase, `seller-orders:${context.userId}`).on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_status_history", filter: `order_id=${csv(context.sellerOrderIds)}` },
        (payload: ChangePayload<Tables<"order_status_history">>) => {
          if (hasRow(payload)) emitScoped({ ...orderHistoryEventFromRow(payload.new), scope: "seller" });
        },
      ),
    );
  }

  if (isAdmin(context)) {
    addChannel(
      scopedChannel(supabase, `admin:${context.userId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: "type=eq.ADMIN_ALERT" }, (payload: ChangePayload<Tables<"notifications">>) => {
          if (hasRow(payload)) emitScoped({ ...notificationEventFromRow(payload.new, "INSERT"), scope: "admin" });
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: "type=eq.ADMIN_ALERT" }, (payload: ChangePayload<Tables<"notifications">>) => {
          if (hasRow(payload)) emitScoped({ ...notificationEventFromRow(payload.new, "UPDATE"), scope: "admin" });
        }),
    );
  }
}

export async function startScopedRealtimeSubscriptions(queryClient: QueryClient, callbacks: ScopedRealtimeCallbacks) {
  const supabase = createSupabaseBrowserClient();
  const invalidator = new ThrottledInvalidator(queryClient, (count) => callbacks.onObservability({ throttledInvalidations: count }));
  const coalescer = new RealtimeEventCoalescer((events, duplicateCount) => {
    callbacks.onObservability({ duplicateEvents: duplicateCount });
    for (const event of events) {
      callbacks.onEvent(event);
      invalidator.schedule(routeInvalidation(event));
      callbacks.onObservability({
        eventLatencyMs: Math.max(0, Date.now() - new Date(event.createdAt).getTime()),
        estimatedBandwidthBytes: estimateEventBytes(event),
      });
    }
  });
  const channels: RealtimeChannel[] = [];
  let disposed = false;
  let leaderCheckTimer: ReturnType<typeof setInterval> | null = null;

  const activeTabId = getRealtimeTabId();

  const updatePassiveState = () => {
    callbacks.onConnectionState("degraded");
    callbacks.onObservability({
      passiveTabs: 1,
      leaderTabId: getRealtimeLeaderTabId(),
      activeChannels: channels.length,
    });
  };

  const emit = (event: MarketplaceRealtimeEvent) => {
    callbacks.onObservability({
      eventLatencyMs: Math.max(0, Date.now() - new Date(event.createdAt).getTime()),
      estimatedBandwidthBytes: estimateEventBytes(event),
    });
    recordOperationalEvent("debug", "realtime.event_propagated", {
      table: event.table,
      type: event.type,
      scope: event.scope,
      bytes: estimateEventBytes(event),
      latencyMs: Math.max(0, Date.now() - new Date(event.createdAt).getTime()),
    }, { domain: "realtime", subjectId: event.id });
    publishMarketplaceRealtimeEvent(event);
    invalidator.schedule(routeInvalidation(event));
  };

  const addChannel = (channel: RealtimeChannel) => {
    channels.push(channel);
    channel.subscribe((status) => observeStatus(status as ChannelStatus, callbacks, channels.length));
  };

  const stopLeaderChannels = () => {
    for (const channel of channels.splice(0, channels.length)) {
      void supabase.removeChannel(channel);
    }
    invalidator.dispose();
    callbacks.onObservability({ activeChannels: 0 });
  };

  const startLeaderChannels = async () => {
    if (disposed) return;
    if (!acquireRealtimeLeaderLease()) {
      updatePassiveState();
      return;
    }

    callbacks.onConnectionState("connecting");
    callbacks.onObservability({
      leaderTabId: activeTabId,
      passiveTabs: 0,
      activeChannels: 0,
    });

    const context = await loadRealtimeContext(supabase);
    if (!context || disposed) {
      callbacks.onConnectionState("offline");
      recordOperationalEvent("warn", "realtime.context_unavailable", { tabId: activeTabId }, { domain: "realtime" });
      releaseRealtimeLeaderLease();
      return;
    }

    buildLeaderSubscriptions(supabase, context, emit, addChannel);
    callbacks.onObservability({
      activeChannels: channels.length,
      leaderTabId: activeTabId,
      passiveTabs: 0,
    });
  };

  const scheduleLeadershipRetry = () => {
    if (leaderCheckTimer || disposed || isRealtimeLeader()) return;
    leaderCheckTimer = setInterval(() => {
      if (disposed) return;
      if (isRealtimeLeader()) {
        callbacks.onObservability({ leaderTabId: activeTabId, passiveTabs: 0 });
        return;
      }
      if (acquireRealtimeLeaderLease()) {
        stopLeaderChannels();
        void startLeaderChannels();
      }
    }, 3_000);
  };

  callbacks.onConnectionState("connecting");

  const tabSyncCleanup = subscribeMarketplaceRealtimeEvents((event) => {
    if (disposed) return;
    coalescer.push(event);
  });

  await startLeaderChannels();
  if (!isRealtimeLeader()) {
    scheduleLeadershipRetry();
  }

  const onVisibilityChange = () => {
    if (disposed) return;
    if (document.visibilityState === "visible" && !isRealtimeLeader()) {
      scheduleLeadershipRetry();
    }
  };

  const onOnline = () => {
    if (disposed) return;
    callbacks.onConnectionState("connecting");
    recordOperationalEvent("info", "realtime.client_online", { tabId: activeTabId, activeChannels: channels.length }, { domain: "realtime" });
    if (isRealtimeLeader()) {
      invalidator.schedule(["orders", "seller", "admin", "products", "cart"]);
    }
  };

  const onOffline = () => {
    if (disposed) return;
    callbacks.onConnectionState("offline");
    recordOperationalEvent("warn", "realtime.client_offline", { tabId: activeTabId, activeChannels: channels.length }, { domain: "realtime" });
  };

  const onStorage = (event: StorageEvent) => {
    if (disposed || event.key !== "vendorhub:realtime-leader") return;

    const leaderId = getRealtimeLeaderTabId();
    if (leaderId === activeTabId) {
      callbacks.onObservability({ leaderTabId: activeTabId, passiveTabs: 0 });
      return;
    }

    if (!leaderId) {
      scheduleLeadershipRetry();
      return;
    }

    if (channels.length) {
      stopLeaderChannels();
    }
    updatePassiveState();
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  window.addEventListener("storage", onStorage);
  window.addEventListener("beforeunload", onOffline, { once: true });

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (leaderCheckTimer) clearInterval(leaderCheckTimer);
    tabSyncCleanup?.();
    coalescer.dispose();
    stopLeaderChannels();
    releaseRealtimeLeaderLease();
    callbacks.onObservability({ activeChannels: 0, passiveTabs: 0, staleListeners: 0 });
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("beforeunload", onOffline);
  };

  return () => {
    dispose();
  };
}
