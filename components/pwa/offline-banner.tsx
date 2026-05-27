"use client";

import { CloudOff, RefreshCw, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useMobileStore } from "@/store/mobile-store";

export function OfflineBanner() {
  const isOnline = useMobileStore((state) => state.isOnline);
  const connectionLabel = useMobileStore((state) => state.connectionLabel);
  const lastReconnectAt = useMobileStore((state) => state.lastReconnectAt);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (!isOnline || !lastReconnectAt) return;
    setShowReconnected(true);
    const timeout = window.setTimeout(() => setShowReconnected(false), 3200);
    return () => window.clearTimeout(timeout);
  }, [isOnline, lastReconnectAt]);

  if (isOnline && !showReconnected && !["slow-2g", "2g", "3g", "data saver"].includes(connectionLabel)) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 border-b border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        {isOnline ? <Wifi className="size-4 shrink-0" /> : <CloudOff className="size-4 shrink-0" />}
        <p className="min-w-0 flex-1">
          {isOnline ? (showReconnected ? "You're back online." : "Your connection is slow. Shopping still works.") : "You're offline. Some shopping actions may pause until your connection returns."}
        </p>
        <Button size="sm" variant="secondary" className="h-8 bg-white" onClick={() => window.location.reload()}>
          <RefreshCw /> Refresh
        </Button>
      </div>
    </div>
  );
}
