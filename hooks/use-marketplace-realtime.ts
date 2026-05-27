"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useRealtimeStore } from "@/store/realtime-store";

export function useMarketplaceRealtime() {
  const { connectionState, lastSyncedAt, events, observability } = useRealtimeStore(
    useShallow((state) => ({
      connectionState: state.connectionState,
      lastSyncedAt: state.lastSyncedAt,
      events: state.events,
      observability: state.observability,
    })),
  );

  return useMemo(
    () => ({
      connectionState,
      lastSyncedAt,
      events,
      observability,
      orderEvents: events.filter((event) => event.table === "orders" || event.table === "order_status_history"),
      inventoryEvents: events.filter((event) => event.table === "inventory"),
      notificationEvents: events.filter((event) => event.table === "notifications"),
    }),
    [connectionState, events, lastSyncedAt, observability],
  );
}

