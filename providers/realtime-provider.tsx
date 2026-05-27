"use client";

import { ReactNode, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { env } from "@/lib/env";
import { notificationFromRealtimeEvent } from "@/lib/realtime/mappers";
import { startScopedRealtimeSubscriptions } from "@/lib/realtime/scoped-subscriptions";
import type { MarketplaceRealtimeEvent } from "@/lib/realtime/types";
import { useNotificationStore } from "@/store/notification-store";
import { useRealtimeStore } from "@/store/realtime-store";

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const pushEvent = useRealtimeStore((state) => state.pushEvent);
  const setConnectionState = useRealtimeStore((state) => state.setConnectionState);
  const setObservability = useRealtimeStore((state) => state.setObservability);
  const appendNotification = useNotificationStore((state) => state.appendNotification);

  const handleEvent = useMemo(
    () => (event: MarketplaceRealtimeEvent) => {
      pushEvent(event);
      appendNotification(notificationFromRealtimeEvent(event));
    },
    [appendNotification, pushEvent],
  );

  useEffect(() => {
    if (!env.supabaseUrl || !env.supabaseAnonKey) {
      setConnectionState("offline");
      return undefined;
    }

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    void startScopedRealtimeSubscriptions(queryClient, {
      onConnectionState: setConnectionState,
      onEvent: handleEvent,
      onObservability: setObservability,
    }).then((dispose) => {
      if (cancelled) {
        dispose();
        return;
      }

      cleanup = dispose;
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [handleEvent, queryClient, setConnectionState, setObservability]);

  return children;
}
