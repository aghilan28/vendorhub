"use client";

import { Clock3, PackageCheck, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { marketplaceProducts } from "@/features/marketplace/lib/data";
import { seedDeliveries } from "../data";

export function HomepageDeliveryIntelligence() {
  const readyProducts = marketplaceProducts.filter((product) => product.stockCount > 0 && (product.deliveryMinutes ?? 60) <= 30).slice(0, 4);
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <DeliverySignal icon={Truck} label="Fast delivery nearby" value={`${readyProducts.length} ready`} detail="Local sellers can pack these in under 30 minutes" />
      <DeliverySignal icon={Clock3} label="Same-day delivery" value="Available" detail="Choose the timing that works for your home" />
      <DeliverySignal icon={PackageCheck} label="Orders moving" value={`${seedDeliveries.filter((delivery) => delivery.status !== "FAILED").length} active`} detail="Packed orders are easy to follow" />
    </section>
  );
}

export function ProductDeliveryPromise({ deliveryMinutes, stockCount }: { deliveryMinutes?: number; stockCount: number }) {
  const sameDayEligible = stockCount > 0 && (deliveryMinutes ?? 90) <= 45;
  return (
    <div className="rounded-md border border-border bg-slate-50 p-3">
      <div className="flex flex-wrap gap-2">
        <Badge variant={sameDayEligible ? "default" : "secondary"}>
          <Truck className="size-3" /> {sameDayEligible ? "Delivered today" : "Check delivery"}
        </Badge>
        <Badge variant="secondary">{stockCount} in stock</Badge>
      </div>
      <p className="mt-2 text-sm text-secondary-text">
        Packed by the seller and delivered from a nearby store partner.
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
