"use client";

// MCP-1C Phase 9 — Buyer Hyperlocal Experience.
// Location selector → nearby stores → best-store selection → serviceability +
// ETA indicators. Interactive; runs the deterministic engine in local state.

import { useMemo, useState } from "react";
import { Clock, MapPin, Navigation, Store as StoreIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import {
  discoverStores,
  estimateDelivery,
  evaluateServiceability,
  selectStore,
  type Coordinates,
  type StoreLocation,
} from "@/lib/hyperlocal";

const LOCATIONS: Array<{ id: string; label: string; coords: Coordinates }> = [
  { id: "mg", label: "MG Road", coords: { latitude: 12.9716, longitude: 77.5946 } },
  { id: "whitefield", label: "Whitefield", coords: { latitude: 12.9698, longitude: 77.7499 } },
  { id: "jayanagar", label: "Jayanagar", coords: { latitude: 12.9252, longitude: 77.5833 } },
  { id: "hebbal", label: "Hebbal", coords: { latitude: 13.0358, longitude: 77.597 } },
];

const statusBadge: Record<string, "default" | "secondary" | "warning" | "danger"> = {
  serviceable: "default",
  limited: "warning",
  not_serviceable: "danger",
  unknown: "secondary",
};

export function BuyerHyperlocal({ stores, sampled }: { stores: StoreLocation[]; sampled: boolean }) {
  const [locationId, setLocationId] = useState(LOCATIONS[0].id);
  const buyer = LOCATIONS.find((l) => l.id === locationId)!.coords;

  const discovered = useMemo(() => discoverStores(stores, buyer, 15), [stores, buyer]);
  const selection = useMemo(() => selectStore({ stores, buyer }), [stores, buyer]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-primary-text"><Navigation className="size-5" /> Shop nearby</h1>
          <p className="text-sm text-secondary-text">Local stores that can deliver to you, ranked and ready.</p>
        </div>
        <Badge variant={sampled ? "warning" : "default"}>{sampled ? "Preview (sample data)" : "Live data"}</Badge>
      </div>

      <GovernanceCard title="Your location" description="Choose a delivery location to see nearby, serviceable stores." action={<MapPin className="size-4 text-secondary-text" />}>
        <div className="flex flex-wrap gap-2">
          {LOCATIONS.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => setLocationId(loc.id)}
              className={`focus-ring rounded-full px-3 py-1.5 text-sm transition-colors ${loc.id === locationId ? "bg-brand text-white" : "bg-slate-100 text-secondary-text"}`}
            >
              {loc.label}
            </button>
          ))}
        </div>
      </GovernanceCard>

      {selection.best ? (
        <GovernanceCard title="Best store for you" description="Auto-selected by distance, stock, trust, capacity and fulfillment." action={<StoreIcon className="size-4 text-secondary-text" />}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium text-primary-text">{selection.best.name}</p>
              <p className="text-xs text-secondary-text">{selection.best.distanceKm !== null ? `${selection.best.distanceKm.toFixed(1)} km away` : "Distance pending"} · match score {selection.best.score}</p>
            </div>
            <Badge variant={statusBadge[selection.best.serviceability]}>{selection.best.serviceability.replace(/_/g, " ")}</Badge>
          </div>
        </GovernanceCard>
      ) : null}

      <GovernanceCard title={`Nearby stores (${discovered.length})`} description="Sorted by distance.">
        <div className="space-y-2">
          {discovered.map(({ store, distanceKm }) => {
            const serviceability = evaluateServiceability({ store, buyer });
            const eta = estimateDelivery({ store, buyer });
            return (
              <div key={store.storeId} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-primary-text">{store.name}</p>
                    <p className="text-xs text-secondary-text">{distanceKm !== null ? `${distanceKm.toFixed(1)} km` : "—"} · ⭐ {store.rating ?? "—"}{store.inStock === false ? " · out of stock" : ""}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={statusBadge[serviceability.status]}>{serviceability.status.replace(/_/g, " ")}</Badge>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-secondary-text"><Clock className="size-3" /> {eta.label}</p>
                  </div>
                </div>
                {serviceability.status !== "serviceable" ? <p className="mt-1 text-xs text-amber-700">{serviceability.reason}</p> : <p className="mt-1 text-xs text-emerald-700">Delivery confidence {eta.confidence}%</p>}
              </div>
            );
          })}
          {discovered.length === 0 ? <p className="text-sm text-secondary-text">No stores serve this location yet.</p> : null}
        </div>
      </GovernanceCard>
    </div>
  );
}
