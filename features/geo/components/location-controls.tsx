"use client";

import { LocateFixed, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { chennaiLocationPresets } from "@/lib/geo";
import { useLocationStore } from "@/store/location-store";

export function LocationControlBar() {
  const currentLocation = useLocationStore((state) => state.currentLocation);
  const permissionState = useLocationStore((state) => state.permissionState);
  const error = useLocationStore((state) => state.error);
  const requestBrowserLocation = useLocationStore((state) => state.requestBrowserLocation);
  const setManualLocation = useLocationStore((state) => state.setManualLocation);

  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-50 px-4 text-sm font-semibold text-emerald-800">
            <MapPin className="size-4" aria-hidden /> {currentLocation.locality}, {currentLocation.city}
          </p>
          {error ? <p className="mt-2 text-xs font-medium text-warning">{error}</p> : null}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={requestBrowserLocation} disabled={permissionState === "requesting"} aria-label="Use current location">
            {permissionState === "requesting" ? <Navigation className="animate-pulse" /> : <LocateFixed />}
            {permissionState === "requesting" ? "Detecting" : "Use GPS"}
          </Button>
          <label className="sr-only" htmlFor="manual-location">Choose delivery area</label>
          <select
            id="manual-location"
            value={currentLocation.id}
            onChange={(event) => setManualLocation(event.target.value)}
            className="focus-ring h-11 rounded-md border border-border bg-surface px-3 text-sm"
          >
            {chennaiLocationPresets.map((location) => (
              <option key={location.id} value={location.id}>
                {location.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
