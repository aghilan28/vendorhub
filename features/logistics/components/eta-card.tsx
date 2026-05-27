"use client";

import { Clock3, Navigation, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { etaProgressPercent } from "../eta";
import type { Delivery } from "../types";

export function EtaCard({ delivery }: { delivery: Delivery }) {
  const progress = etaProgressPercent(delivery.status);
  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge variant="default">
          <Clock3 className="size-3" /> ETA {delivery.etaWindow}
        </Badge>
      </div>
      <h2 className="mt-3 text-2xl font-semibold text-primary-text">{delivery.orderCode}</h2>
      <p className="mt-2 text-sm leading-6 text-secondary-text">
        {delivery.partner.name} · {delivery.distanceKm.toFixed(1)} km · promise by{" "}
        {new Date(delivery.promisedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
      </p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <span className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-secondary-text">
          <Navigation className="size-4 text-emerald-700" /> {delivery.assignedTo ?? "Partner assignment pending"} {delivery.assignedPhone ? `· ${delivery.assignedPhone}` : ""}
        </span>
        <span className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-secondary-text">
          <ShieldCheck className="size-4 text-emerald-700" /> Delivery updates appear here as your order moves.
        </span>
      </div>
    </section>
  );
}
