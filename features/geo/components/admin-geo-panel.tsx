"use client";

import { MapPin, Radar, Store, Truck } from "lucide-react";
import { OperationalBarChart } from "@/components/charts/operational-bar-chart";
import { Badge } from "@/components/ui/badge";
import { marketplaceVendors } from "@/features/marketplace/lib/data";
import { chennaiLocationPresets, rankVendorsByGeo } from "@/lib/geo";
import { useLocationStore } from "@/store/location-store";

export function AdminGeoPanel() {
  const location = useLocationStore((state) => state.currentLocation);
  const ranked = rankVendorsByGeo(marketplaceVendors, location, 15);
  const avgRadius = marketplaceVendors.length ? marketplaceVendors.reduce((sum, vendor) => sum + (vendor.serviceRadiusKm ?? 5), 0) / marketplaceVendors.length : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Metric icon={Store} label="Geo-pinned vendors" value={String(marketplaceVendors.length)} />
        <Metric icon={Truck} label="Avg service radius" value={`${avgRadius.toFixed(1)} km`} />
        <Metric icon={Radar} label="Reference regions" value={String(chennaiLocationPresets.length)} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-md border border-border bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium text-primary-text">Regional activity</p>
            <Badge variant="secondary">Awaiting real sellers</Badge>
          </div>
          <OperationalBarChart values={[0]} />
        </div>
        <div className="space-y-2">
          {ranked.slice(0, 5).map((vendor) => (
            <div key={vendor.id} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-primary-text">{vendor.name}</p>
                <Badge variant={vendor.feasibility.status === "outside_radius" ? "warning" : "default"}>{vendor.feasibility.status.replace("_", " ")}</Badge>
              </div>
              <p className="mt-1 text-xs text-secondary-text">
                <MapPin className="mr-1 inline size-3" />
                {vendor.locality} · {vendor.serviceRadiusKm} km coverage · {vendor.coverageNote}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Store; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-slate-50 p-3">
      <Icon className="size-4 text-emerald-700" />
      <p className="mt-2 text-xs font-medium uppercase text-secondary-text">{label}</p>
      <p className="mt-1 text-xl font-semibold text-primary-text">{value}</p>
    </div>
  );
}
