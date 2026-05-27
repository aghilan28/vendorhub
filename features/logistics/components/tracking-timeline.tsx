"use client";

import { CheckCircle2, Circle, MapPin } from "lucide-react";
import type { Delivery } from "../types";
import { DeliveryStatusBadge } from "./delivery-status-badge";

export function TrackingTimeline({ delivery }: { delivery: Delivery }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-primary-text">Live delivery timeline</h2>
          <p className="mt-1 text-sm text-secondary-text">Timestamped dispatch, pickup, transit, and ETA events.</p>
        </div>
        <DeliveryStatusBadge status={delivery.status} />
      </div>
      <ol className="mt-4 space-y-4" aria-label="Delivery tracking events">
        {delivery.events.map((event, index) => {
          const isLatest = index === delivery.events.length - 1;
          return (
            <li key={event.id} className="grid grid-cols-[28px_1fr] gap-3">
              <div className="pt-1">
                {isLatest ? <Circle className="size-5 fill-emerald-100 text-emerald-700" /> : <CheckCircle2 className="size-5 text-emerald-700" />}
              </div>
              <div className="rounded-md border border-border bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-primary-text">{event.title}</p>
                  <time className="text-xs font-medium text-secondary-text">{new Date(event.occurredAt).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}</time>
                </div>
                <p className="mt-1 text-sm text-secondary-text">{event.description}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-secondary-text">
                  {event.locationLabel ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" /> {event.locationLabel}
                    </span>
                  ) : null}
                  {event.etaMinutes ? <span>{event.etaMinutes} min ETA at event time</span> : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
