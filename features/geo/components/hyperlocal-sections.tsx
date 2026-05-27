"use client";

import { Clock3 } from "lucide-react";
import { ProductGrid } from "@/components/commerce/product-grid";
import { marketplaceProducts } from "@/features/marketplace/lib/data";
import { rankProductsByGeo } from "@/lib/geo";
import { useLocationStore } from "@/store/location-store";

export function HyperlocalHomepageSections() {
  const location = useLocationStore((state) => state.currentLocation);
  const radiusKm = useLocationStore((state) => state.radiusKm);
  const nearbyProducts = rankProductsByGeo(marketplaceProducts, location, radiusKm).slice(0, 4).map((item) => item.product);
  const fastProducts = rankProductsByGeo(marketplaceProducts, location, radiusKm)
    .filter((item) => item.feasibility.status !== "outside_radius")
    .sort((a, b) => (a.feasibility.etaMinutes ?? 999) - (b.feasibility.etaMinutes ?? 999))
    .slice(0, 4)
    .map((item) => item.product);

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-primary-text">Popular nearby</h2>
          <p className="text-sm text-secondary-text">Fresh essentials available around {location.locality}.</p>
        </div>
        <ProductGrid products={nearbyProducts} compact />
      </section>

      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary-text">Fast delivery nearby</h2>
            <p className="mt-1 text-sm text-secondary-text">Quick picks ready for your next basket.</p>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-secondary-text"><Clock3 className="size-4" /> 20-30 min</span>
        </div>
        <div className="mt-4">
          <ProductGrid products={fastProducts} compact />
        </div>
      </section>
    </div>
  );
}
