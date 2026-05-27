"use client";

import { MapPinned, Navigation } from "lucide-react";
import { formatDistance, rankVendorsByGeo } from "@/lib/geo";
import { marketplaceVendors } from "@/features/marketplace/lib/data";
import { useLocationStore } from "@/store/location-store";
import type { Vendor } from "@/types";

export function ServiceZoneMapPreview({ vendor }: { vendor?: Vendor }) {
  const currentLocation = useLocationStore((state) => state.currentLocation);
  const vendors = vendor ? [vendor] : rankVendorsByGeo(marketplaceVendors, currentLocation, 15).slice(0, 6);

  return (
    <div className="relative min-h-[260px] overflow-hidden rounded-lg border border-border bg-[#eef7f2] p-4 shadow-sm" role="img" aria-label="Map preview of nearby vendor service zones">
      <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(#d9e6df_1px,transparent_1px),linear-gradient(90deg,#d9e6df_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="relative z-10 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary-text">{vendor ? "Seller service zone" : "Nearby vendor coverage"}</p>
          <p className="mt-1 text-xs text-secondary-text">Map provider slot ready for Mapbox or Google Maps token.</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md bg-white/85 px-2 py-1 text-xs font-medium text-secondary-text">
          <Navigation className="size-3.5" /> {currentLocation.locality}
        </span>
      </div>

      <div className="absolute left-1/2 top-1/2 z-10 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-600 shadow-md" />
      <div className="absolute left-1/2 top-1/2 size-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-500/40 bg-emerald-500/10" />
      <div className="absolute left-1/2 top-1/2 size-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-600/20 bg-emerald-600/5" />

      <div className="relative z-10 mt-16 grid gap-2 sm:grid-cols-2">
        {vendors.map((item, index) => {
          const distanceKm = "distanceKm" in item && typeof item.distanceKm === "number" ? item.distanceKm : null;
          return (
            <div key={item.id} className="rounded-md border border-white/80 bg-white/90 p-3 text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <MapPinned className="size-4 text-emerald-700" />
                <p className="font-semibold text-primary-text">{item.name}</p>
              </div>
              <p className="mt-1 text-secondary-text">
                {item.locality} · {formatDistance(distanceKm)} · {item.serviceRadiusKm ?? 5} km radius
              </p>
              <div className={`mt-2 h-1 rounded-full ${index % 2 ? "bg-amber-300" : "bg-emerald-500"}`} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
