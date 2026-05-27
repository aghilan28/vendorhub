"use client";

import { AlertTriangle, MapPin, Navigation, PackageCheck, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { deliveryFeasibility, formatDistance, productDeliveryLabel, rankProductsByGeo } from "@/lib/geo";
import { marketplaceProducts } from "@/features/marketplace/lib/data";
import { useLocationStore } from "@/store/location-store";
import type { Product } from "@/types";
import { ServiceZoneMapPreview } from "./map-preview";

export function ProductGeoPanel({ product }: { product: Product }) {
  const location = useLocationStore((state) => state.currentLocation);
  const feasibility = deliveryFeasibility(product.vendor, location);
  const alternatives = rankProductsByGeo(
    marketplaceProducts.filter((item) => item.id !== product.id && item.category.slug === product.category.slug),
    location,
    8,
  ).slice(0, 3);

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_420px]">
      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <Badge variant={feasibility.status === "outside_radius" ? "warning" : "default"}>
            <Truck className="size-3" /> {feasibility.label}
          </Badge>
          <Badge variant="secondary">
            <MapPin className="size-3" /> {formatDistance(feasibility.distanceKm)}
          </Badge>
        </div>
        <h2 className="mt-3 font-semibold text-primary-text">Local delivery intelligence</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <GeoFact icon={Navigation} label="Service radius" value={`${feasibility.radiusKm ?? product.vendor.serviceRadiusKm ?? 5} km`} />
          <GeoFact icon={Truck} label="Arrival placeholder" value={productDeliveryLabel(product, location)} />
          <GeoFact icon={PackageCheck} label="Local stock" value={`${product.stockCount} units visible`} />
        </div>
        {feasibility.status === "outside_radius" ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="mr-2 inline size-4" />
            This seller is outside the selected delivery radius. Choose a closer address or compare nearby alternatives.
          </div>
        ) : null}
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-primary-text">Nearby alternatives</p>
          {alternatives.map((item) => (
            <div key={item.product.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
              <span className="font-medium text-primary-text">{item.product.name}</span>
              <span className="text-secondary-text">{formatDistance(item.distanceKm)}</span>
            </div>
          ))}
        </div>
      </div>
      <ServiceZoneMapPreview vendor={product.vendor} />
    </section>
  );
}

function GeoFact({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <Icon className="size-4 text-emerald-700" />
      <p className="mt-2 text-xs font-medium uppercase text-secondary-text">{label}</p>
      <p className="mt-1 text-sm font-semibold text-primary-text">{value}</p>
    </div>
  );
}
