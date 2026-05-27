"use client";

import { useEffect, useState } from "react";
import { useMobileStore } from "@/store/mobile-store";
import { useRealtimeStore } from "@/store/realtime-store";

export function AccessibilityAnnouncer() {
  const isOnline = useMobileStore((state) => state.isOnline);
  const connectionLabel = useMobileStore((state) => state.connectionLabel);
  const realtimeState = useRealtimeStore((state) => state.connectionState);
  const lastSyncedAt = useRealtimeStore((state) => state.lastSyncedAt);
  const [announcement, setAnnouncement] = useState("VendorHub production experience ready.");

  useEffect(() => {
    if (!isOnline) {
      setAnnouncement("VendorHub is offline. Cached views are available and checkout actions are paused.");
      return;
    }

    if (["slow-2g", "2g", "3g", "data saver"].includes(connectionLabel)) {
      setAnnouncement(`VendorHub is in low-network mode using ${connectionLabel}. Critical flows remain recoverable.`);
      return;
    }

    setAnnouncement("VendorHub is online.");
  }, [connectionLabel, isOnline]);

  useEffect(() => {
    if (realtimeState === "connected" && lastSyncedAt) {
      setAnnouncement(`Realtime updates connected. Last sync ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`);
    }

    if (realtimeState === "degraded") {
      setAnnouncement("Realtime updates are degraded. Last trusted state remains visible.");
    }

    if (realtimeState === "offline") {
      setAnnouncement("Realtime updates are offline. VendorHub is using local fallback state.");
    }
  }, [lastSyncedAt, realtimeState]);

  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      {announcement}
    </div>
  );
}
