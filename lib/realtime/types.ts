import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import type { Database, Tables } from "@/types/database";

export type RealtimeConnectionState = "idle" | "connecting" | "connected" | "degraded" | "offline";

export type MarketplaceRealtimeTable =
  | "orders"
  | "order_status_history"
  | "inventory"
  | "notifications"
  | "cart_items"
  | "wishlists"
  | "seller_payout_attributions"
  | "delivery_tracking_events";

export type MarketplaceRealtimeEventType =
  | "order.created"
  | "order.updated"
  | "order.history"
  | "inventory.updated"
  | "notification.created"
  | "notification.updated"
  | "cart.updated"
  | "wishlist.updated"
  | "payout.updated"
  | "delivery.updated"
  | "sync.local";

export type MarketplaceRealtimeSource = "supabase" | "optimistic" | "local" | "tab-sync";
export type MarketplaceRealtimeScope = "buyer" | "seller" | "admin" | "marketplace";

export interface MarketplaceRealtimeEvent {
  id: string;
  type: MarketplaceRealtimeEventType;
  table: MarketplaceRealtimeTable;
  title: string;
  body: string;
  source: MarketplaceRealtimeSource;
  scope: MarketplaceRealtimeScope;
  entityId?: string;
  vendorId?: string | null;
  organizationId?: string | null;
  workspaceId?: string | null;
  tenantIsolationKey?: string | null;
  recipientId?: string | null;
  createdAt: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export type OrderRealtimePayload = RealtimePostgresChangesPayload<Tables<"orders">>;
export type OrderHistoryRealtimePayload = RealtimePostgresChangesPayload<Tables<"order_status_history">>;
export type InventoryRealtimePayload = RealtimePostgresChangesPayload<Tables<"inventory">>;
export type NotificationRealtimePayload = RealtimePostgresChangesPayload<Tables<"notifications">>;

export type RealtimeTableRow<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];

export type DeliveryTrackingRealtimeRow = Record<string, unknown> & {
  id: string;
  created_at: string;
  delivery_id: string;
  status: string;
  event_type: string;
  title: string;
  body: string;
  actor_id: string | null;
  actor_type: string;
  location_label: string | null;
  eta_minutes: number | null;
  metadata: Record<string, unknown>;
};

export interface RealtimeObservabilitySnapshot {
  activeChannels: number;
  duplicateEvents: number;
  throttledInvalidations: number;
  reconnects: number;
  failedSubscriptions: number;
  passiveTabs: number;
  staleListeners: number;
  eventLatencyMs: number;
  estimatedBandwidthBytes: number;
  leaderTabId?: string;
  lastError?: string;
}
