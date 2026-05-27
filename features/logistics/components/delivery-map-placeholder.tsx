"use client";

import { MapPinned, Route } from "lucide-react";
import type { Delivery } from "../types";

export function DeliveryMapPlaceholder({ delivery }: { delivery: Delivery }) {
  return (
    <section className="relative min-h-[260px] overflow-hidden rounded-lg border border-border bg-[#eef4f7] p-4 shadow-sm" role="img" aria-label="Delivery route placeholder map">
      <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(#d5e3e7_1px,transparent_1px),linear-gradient(90deg,#d5e3e7_1px,transparent_1px)] [background-size:30px_30px]" />
      <div className="relative z-10 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-primary-text">Tracking map placeholder</p>
          <p className="mt-1 text-xs text-secondary-text">Route and moving courier data can attach to delivery_tracking_events later.</p>
        </div>
        <Route className="size-5 text-emerald-700" />
      </div>
      <div className="absolute left-[18%] top-[64%] z-10 rounded-md bg-white px-3 py-2 text-xs font-medium text-primary-text shadow-sm">
        <MapPinned className="mr-1 inline size-3 text-emerald-700" /> {delivery.vendorName}
      </div>
      <div className="absolute right-[14%] top-[26%] z-10 rounded-md bg-white px-3 py-2 text-xs font-medium text-primary-text shadow-sm">
        Dropoff
      </div>
      <div className="absolute left-[28%] top-[56%] h-1 w-[48%] -rotate-[24deg] rounded-full bg-emerald-500/70" />
      <div className="absolute left-[52%] top-[42%] z-10 size-4 rounded-full border-2 border-white bg-emerald-700 shadow-md" />
    </section>
  );
}
