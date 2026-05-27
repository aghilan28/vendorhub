"use client";

import { Bell, Boxes, ClipboardList, Heart, ShoppingCart, Truck, WalletCards } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { useMarketplaceRealtime } from "@/hooks/use-marketplace-realtime";
import type { MarketplaceRealtimeTable } from "@/lib/realtime/types";

const icons = {
  orders: ClipboardList,
  order_status_history: ClipboardList,
  inventory: Boxes,
  notifications: Bell,
  cart_items: ShoppingCart,
  wishlists: Heart,
  seller_payout_attributions: WalletCards,
  delivery_tracking_events: Truck,
} satisfies Record<MarketplaceRealtimeTable, typeof Bell>;

export function LiveEventFeed({ scope, limit = 5 }: { scope?: "buyer" | "seller" | "admin" | "marketplace"; limit?: number }) {
  const { events } = useMarketplaceRealtime();
  const visibleEvents = events.filter((event) => !scope || event.scope === scope || event.scope === "marketplace").slice(0, limit);
  const feedLabel = `${scope ?? "marketplace"} realtime event feed`;

  if (!visibleEvents.length) {
    return (
      <EmptyState
        icon={Bell}
        title="No live events yet"
        description="Order, inventory, tracking, and notification updates will stream here as they occur."
      />
    );
  }

  return (
    <div className="space-y-3" role="feed" aria-label={feedLabel} aria-live="polite" aria-relevant="additions text">
      {visibleEvents.map((event) => {
        const Icon = icons[event.table];
        return (
          <article key={event.id} className="rounded-md border border-border bg-slate-50 p-3" aria-label={event.title}>
            <div className="flex items-start gap-2">
              <Icon className="mt-0.5 size-4 text-brand" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-primary-text">{event.title}</p>
                <p className="mt-1 text-xs text-secondary-text">{event.body}</p>
                <p className="mt-2 text-xs font-medium uppercase text-secondary-text">
                  {event.source} / {new Date(event.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
