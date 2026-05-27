"use client";

import { Clock3 } from "lucide-react";
import { TimelineItem } from "@/components/commerce/timeline-item";
import { Badge } from "@/components/ui/badge";
import { useMarketplaceRealtime } from "@/hooks/use-marketplace-realtime";
import type { Order } from "@/types";

export function TrackingPanel({ order }: { order: Order }) {
  const { orderEvents } = useMarketplaceRealtime();
  const liveOrderEvents = orderEvents.filter((event) => event.entityId === order.id || event.metadata?.orderNumber === order.code);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <TimelineItem title="Confirmed" description="Order accepted and inventory reserved." time="1:10 PM" />
        <TimelineItem title="Packing" description="Seller is validating item condition and packing." time="1:18 PM" />
        <TimelineItem title="Out for delivery" description="Your order will be on the way soon." time="Pending" />
        <TimelineItem title="Delivered" description="Delivery proof and review prompt will appear here." time="Pending" />
        {liveOrderEvents.map((event) => (
          <TimelineItem
            key={event.id}
            title={event.title}
            description={event.body}
            time={new Date(event.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          />
        ))}
      </div>
      <aside className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <Badge variant="warning"><Clock3 className="size-3" /> ETA updating</Badge>
        <h2 className="mt-3 text-xl font-semibold text-primary-text">{order.code}</h2>
        <p className="mt-2 text-sm text-secondary-text">Estimated delivery: 28-36 minutes.</p>
        <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-secondary-text">
          Delivery address: 12, 8th Cross, Malleswaram, Bengaluru
        </div>
      </aside>
    </div>
  );
}
