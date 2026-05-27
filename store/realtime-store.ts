import { create } from "zustand";
import type { MarketplaceRealtimeEvent, RealtimeConnectionState, RealtimeObservabilitySnapshot } from "@/lib/realtime/types";

interface RealtimeState {
  connectionState: RealtimeConnectionState;
  lastSyncedAt?: string;
  events: MarketplaceRealtimeEvent[];
  observability: RealtimeObservabilitySnapshot;
  setConnectionState: (connectionState: RealtimeConnectionState) => void;
  pushEvent: (event: MarketplaceRealtimeEvent) => void;
  setObservability: (observability: Partial<RealtimeObservabilitySnapshot>) => void;
  clearEvents: () => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  connectionState: "idle",
  events: [],
  observability: {
    activeChannels: 0,
    duplicateEvents: 0,
    throttledInvalidations: 0,
    reconnects: 0,
    failedSubscriptions: 0,
    passiveTabs: 0,
    staleListeners: 0,
    eventLatencyMs: 0,
    estimatedBandwidthBytes: 0,
  },
  setConnectionState: (connectionState) =>
    set((state) => ({
      connectionState,
      lastSyncedAt: connectionState === "connected" ? new Date().toISOString() : state.lastSyncedAt,
      observability: {
        ...state.observability,
        reconnects: connectionState === "connecting" ? state.observability.reconnects + 1 : state.observability.reconnects,
      },
    })),
  pushEvent: (event) =>
    set((state) => ({
      lastSyncedAt: event.createdAt,
      events: [event, ...state.events.filter((item) => item.id !== event.id)].slice(0, 25),
    })),
  setObservability: (observability) =>
    set((state) => ({
      observability: { ...state.observability, ...observability },
    })),
  clearEvents: () => set({ events: [] }),
}));
