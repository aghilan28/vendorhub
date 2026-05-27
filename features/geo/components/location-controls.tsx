"use client";

import { LocateFixed, MapPin, Navigation, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { chennaiLocationPresets, formatDistance } from "@/lib/geo";
import { useLocationStore } from "@/store/location-store";

export function LocationControlBar() {
  const currentLocation = useLocationStore((state) => state.currentLocation);
  const radiusKm = useLocationStore((state) => state.radiusKm);
  const nearbyOnly = useLocationStore((state) => state.nearbyOnly);
  const permissionState = useLocationStore((state) => state.permissionState);
  const error = useLocationStore((state) => state.error);
  const requestBrowserLocation = useLocationStore((state) => state.requestBrowserLocation);
  const setManualLocation = useLocationStore((state) => state.setManualLocation);
  const setRadius = useLocationStore((state) => state.setRadius);
  const setNearbyOnly = useLocationStore((state) => state.setNearbyOnly);

  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800">
              <MapPin className="size-4" /> {currentLocation.locality}, {currentLocation.city}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-secondary-text">
              <ShieldCheck className="size-3.5" /> Used only for nearby availability and delivery checks
            </span>
          </div>
          <p className="mt-2 text-sm text-secondary-text">
            Browse within {radiusKm} km. GPS is optional; area selection keeps hyperlocal discovery useful without forcing precise location access.
          </p>
          {error ? <p className="mt-2 text-xs font-medium text-warning">{error}</p> : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button type="button" variant="secondary" onClick={requestBrowserLocation} disabled={permissionState === "requesting"}>
            {permissionState === "requesting" ? <Navigation className="animate-pulse" /> : <LocateFixed />}
            {permissionState === "requesting" ? "Detecting" : "Use GPS"}
          </Button>
          <label className="sr-only" htmlFor="manual-location">Choose delivery area</label>
          <select
            id="manual-location"
            value={currentLocation.id}
            onChange={(event) => setManualLocation(event.target.value)}
            className="focus-ring h-10 rounded-md border border-border bg-surface px-3 text-sm"
          >
            {chennaiLocationPresets.map((location) => (
              <option key={location.id} value={location.id}>
                {location.label} - {location.pincode}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px]">
        <div className="flex flex-wrap gap-2">
          {chennaiLocationPresets.map((location) => (
            <button
              key={location.id}
              type="button"
              onClick={() => setManualLocation(location.id)}
              className={`rounded-md border px-3 py-2 text-left text-xs transition focus-ring ${
                currentLocation.id === location.id ? "border-emerald-500 bg-emerald-50 text-emerald-900" : "border-border bg-slate-50 text-secondary-text hover:text-primary-text"
              }`}
            >
              <span className="block font-semibold">{location.label}</span>
              <span>{formatDistance(null).replace("Distance pending", location.description)}</span>
            </button>
          ))}
        </div>
        <div className="rounded-md border border-border bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-2 text-sm font-medium text-primary-text">
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal className="size-4" /> Radius
            </span>
            <span>{radiusKm} km</span>
          </div>
          <input
            type="range"
            min="2"
            max="15"
            step="1"
            value={radiusKm}
            onChange={(event) => setRadius(Number(event.target.value))}
            className="mt-3 w-full accent-emerald-600 focus-ring"
            aria-label="Discovery radius"
          />
          <label className="mt-3 flex items-center gap-2 text-sm text-secondary-text">
            <input type="checkbox" checked={nearbyOnly} onChange={(event) => setNearbyOnly(event.target.checked)} className="size-4 accent-emerald-600 focus-ring" />
            Nearby deliverable only
          </label>
        </div>
      </div>
    </section>
  );
}
