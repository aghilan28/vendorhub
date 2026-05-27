"use client";

import { Clock3, MapPin, Store, TrendingUp, Truck } from "lucide-react";
import { ProductGrid } from "@/components/commerce/product-grid";
import { Badge } from "@/components/ui/badge";
import { marketplaceProducts, marketplaceVendors } from "@/features/marketplace/lib/data";
import { formatDistance, rankProductsByGeo, rankVendorsByGeo } from "@/lib/geo";
import { useLocationStore } from "@/store/location-store";
import { ServiceZoneMapPreview } from "./map-preview";

export function HyperlocalHomepageSections() {
  const location = useLocationStore((state) => state.currentLocation);
  const radiusKm = useLocationStore((state) => state.radiusKm);
  const nearbyProducts = rankProductsByGeo(marketplaceProducts, location, radiusKm).slice(0, 4).map((item) => item.product);
  const fastProducts = rankProductsByGeo(marketplaceProducts, location, radiusKm)
    .filter((item) => item.feasibility.status !== "outside_radius")
    .sort((a, b) => (a.feasibility.etaMinutes ?? 999) - (b.feasibility.etaMinutes ?? 999))
    .slice(0, 4)
    .map((item) => item.product);
  const nearbyVendors = rankVendorsByGeo(marketplaceVendors, location, radiusKm).slice(0, 5);

  return (
    <div className="space-y-8">
      <section className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">
              <MapPin className="size-3" /> Products near {location.locality}
            </Badge>
            <Badge variant="secondary">{radiusKm} km discovery radius</Badge>
          </div>
          <h2 className="mt-3 text-xl font-semibold text-primary-text">Nearby Products</h2>
          <p className="mt-1 text-sm text-secondary-text">Inventory ranked by seller distance, delivery radius, stock, and demand signals.</p>
          <div className="mt-4">
            <ProductGrid products={nearbyProducts} compact />
          </div>
        </div>
        <ServiceZoneMapPreview />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <GeoSignalCard icon={Store} label="Sellers around you" value={`${nearbyVendors.length} active`} detail={`Closest seller ${formatDistance(nearbyVendors[0]?.distanceKm ?? null)}`} />
        <GeoSignalCard icon={Truck} label="Fast delivery nearby" value={`${fastProducts[0]?.deliveryMinutes ?? 22} min`} detail="Based on seller prep time and local distance" />
        <GeoSignalCard icon={TrendingUp} label="Trending in your area" value="Fresh + pantry" detail="Local demand signal placeholder ready for analytics" />
      </section>

      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-primary-text">Fast Delivery Nearby</h2>
            <p className="mt-1 text-sm text-secondary-text">Deliverable products prioritized by travel distance and seller readiness.</p>
          </div>
          <Badge variant="secondary">
            <Clock3 className="size-3" /> ETA placeholders only
          </Badge>
        </div>
        <div className="mt-4">
          <ProductGrid products={fastProducts} compact />
        </div>
      </section>
    </div>
  );
}

function GeoSignalCard({ icon: Icon, label, value, detail }: { icon: typeof MapPin; label: string; value: string; detail: string }) {
  return (
    <article className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <Icon className="size-5 text-emerald-700" />
      <p className="mt-3 text-sm font-medium text-secondary-text">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-primary-text">{value}</p>
      <p className="mt-1 text-xs text-secondary-text">{detail}</p>
    </article>
  );
}
