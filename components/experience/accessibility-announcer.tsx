"use client";

import { useEffect, useState } from "react";
import { useMobileStore } from "@/store/mobile-store";
import { useRealtimeStore } from "@/store/realtime-store";

export function AccessibilityAnnouncer() {
  const isOnline = useMobileStore((state) => state.isOnline);
  const connectionLabel = useMobileStore((state) => state.connectionLabel);
  const realtimeState = useRealtimeStore((state) => state.connectionState);
  const [announcement, setAnnouncement] = useState("VendorHub is ready.");

  useEffect(() => {
    if (!isOnline) {
      setAnnouncement("You are offline. Some shopping actions may pause until your connection returns.");
      return;
    }

    if (["slow-2g", "2g", "3g", "data saver"].includes(connectionLabel)) {
      setAnnouncement("Your connection is slow. Shopping still works.");
      return;
    }

    setAnnouncement("VendorHub is online.");
  }, [connectionLabel, isOnline]);

  useEffect(() => {
    if (realtimeState === "connected") {
      setAnnouncement("Product availability is up to date.");
    }

    if (realtimeState === "degraded") {
      setAnnouncement("Product availability may update a little slowly.");
    }

    if (realtimeState === "offline") {
      setAnnouncement("Product availability will refresh when your connection returns.");
    }
  }, [realtimeState]);

  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      {announcement}
    </div>
  );
}
