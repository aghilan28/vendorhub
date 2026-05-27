"use client";

import { AlertTriangle, PackageCheck } from "lucide-react";
import { TrustStrip } from "@/components/experience/trust-strip";
import { EmptyState } from "@/components/feedback/empty-state";
import { useDeliveryTracking } from "../queries";
import { DeliveryMapPlaceholder } from "./delivery-map-placeholder";
import { EtaCard } from "./eta-card";
import { TrackingTimeline } from "./tracking-timeline";

export function BuyerTrackingExperience({ orderId }: { orderId?: string }) {
  const { data: delivery, isLoading, isError } = useDeliveryTracking(orderId);

  if (isLoading) {
    return <div className="h-72 animate-pulse rounded-lg border border-border bg-slate-100" aria-label="Loading delivery tracking" />;
  }
  if (isError || !delivery) {
    return <EmptyState icon={AlertTriangle} title="Tracking is temporarily unavailable" description="Delivery updates are still protected. Try refreshing in a moment." />;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <TrackingTimeline delivery={delivery} />
          <DeliveryMapPlaceholder delivery={delivery} />
        </div>
        <aside className="space-y-5">
          <EtaCard delivery={delivery} />
          <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <h2 className="font-semibold text-primary-text">Delivery trust</h2>
            <TrustStrip
              className="mt-3 sm:grid-cols-1 lg:grid-cols-1"
              label="Delivery trust indicators"
              items={[
                { label: "Handoff", value: "Package verification tracked", icon: PackageCheck },
                { label: "Status", value: delivery.status.replace("_", " "), icon: PackageCheck },
                { label: "Delivery address", value: delivery.deliveryAddress, icon: PackageCheck },
              ]}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}
