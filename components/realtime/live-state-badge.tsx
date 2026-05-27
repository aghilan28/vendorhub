"use client";

import { Activity, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMarketplaceRealtime } from "@/hooks/use-marketplace-realtime";

function labelForState(state: ReturnType<typeof useMarketplaceRealtime>["connectionState"]) {
  if (state === "connected") return "Updates live";
  if (state === "connecting") return "Checking updates";
  if (state === "degraded") return "Updates may be slow";
  if (state === "offline") return "Updates paused";
  return "Ready";
}

export function LiveStateBadge() {
  const { connectionState, lastSyncedAt } = useMarketplaceRealtime();
  const Icon = connectionState === "offline" || connectionState === "degraded" ? WifiOff : connectionState === "connected" ? Wifi : Activity;

  return (
    <div className="flex flex-wrap items-center gap-2" role="status" aria-live="polite">
      <Badge variant={connectionState === "connected" ? "default" : connectionState === "degraded" ? "warning" : "secondary"}>
        <Icon className="size-3" />
        {labelForState(connectionState)}
      </Badge>
      {lastSyncedAt ? <span className="text-xs font-medium text-secondary-text">Synced {new Date(lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span> : null}
    </div>
  );
}
