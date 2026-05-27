"use client";

import { WifiOff } from "lucide-react";
import { useMobileStore } from "@/store/mobile-store";

export function NetworkStatusPill() {
  const isOnline = useMobileStore((state) => state.isOnline);
  const connectionLabel = useMobileStore((state) => state.connectionLabel);

  return (
    <span className="hidden items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-secondary-text sm:flex">
      <WifiOff className="size-3" />
      {isOnline ? connectionLabel : "offline"}
    </span>
  );
}
