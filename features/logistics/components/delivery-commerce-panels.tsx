"use client";

import { Clock3, PackageCheck, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { marketplaceProducts } from "@/features/marketplace/lib/data";
import { seedDeliveries } from "../data";

export function HomepageDeliveryIntelligence() {
  const readyProducts = marketplaceProducts.filter((product) => product.stockCount > 0 && (product.deliveryMinutes ?? 60) <= 30).slice(0, 4);
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <DeliverySignal icon={Truck} label="Fast Delivery Nearby" value={`${readyProducts.length} ready`} detail="Stocked products under 30 min dispatch promise" />
      <DeliverySignal icon={Clock3} label="Same-Day Delivery" value="Enabled" detail="Provider architecture ready for self-delivery and Shiprocket" />
      <DeliverySignal icon={PackageCheck} label="Ready To Deliver" value={`${seedDeliveries.filter((delivery) => delivery.status !== "FAILED").length} active`} detail="Dispatch queue and tracking events are live in demo data" />
    </section>
  );
}

export function ProductDeliveryPromise({ deliveryMinutes, stockCount }: { deliveryMinutes?: number; stockCount: number }) {
  const sameDayEligible = stockCount > 0 && (deliveryMinutes ?? 90) <= 45;
  return (
    <div className="rounded-md border border-border bg-slate-50 p-3">
      <div className="flex flex-wrap gap-2">
        <Badge variant={sameDayEligible ? "default" : "secondary"}>
          <Truck className="size-3" /> {sameDayEligible ? "Same-day eligible" : "Delivery check needed"}
        </Badge>
        <Badge variant="secondary">{stockCount} nearby stock</Badge>
      </div>
      <p className="mt-2 text-sm text-secondary-text">
        Estimated delivery uses seller prep time, local distance, provider mode, service zone, and traffic placeholder factors.
      </p>
    </div>
  );
}

function DeliverySignal({ icon: Icon, label, value, detail }: { icon: typeof Truck; label: string; value: string; detail: string }) {
  return (
    <article className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <Icon className="size-5 text-emerald-700" />
      <p className="mt-3 text-sm font-medium text-secondary-text">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-primary-text">{value}</p>
      <p className="mt-1 text-xs text-secondary-text">{detail}</p>
    </article>
  );
}
