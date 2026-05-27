"use client";

import { AlertTriangle, Clock3, Radar, Truck } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { OperationalBarChart } from "@/components/charts/operational-bar-chart";
import { Badge } from "@/components/ui/badge";
import { useDispatchQueue } from "../queries";
import { DeliveryStatusBadge } from "./delivery-status-badge";

export function AdminDeliveryPanel() {
  const { data, isLoading, isError } = useDispatchQueue();
  if (isLoading) return <div className="h-60 animate-pulse rounded-lg border border-border bg-slate-100" aria-label="Loading logistics oversight" />;
  if (isError || !data) return <EmptyState icon={AlertTriangle} title="Delivery monitoring unavailable" description="Logistics events are temporarily delayed." />;

  const all = [...data.pending, ...data.active, ...data.failed];
  const avgEta = Math.round(all.reduce((sum, delivery) => sum + delivery.etaMinutes, 0) / Math.max(1, all.length));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric icon={Truck} label="Active deliveries" value={String(data.active.length)} />
        <Metric icon={Clock3} label="Avg ETA" value={`${avgEta} min`} />
        <Metric icon={AlertTriangle} label="Failed attempts" value={String(data.failed.length)} />
        <Metric icon={Radar} label="Provider sync" value="Ready" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="rounded-md border border-border bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium text-primary-text">Dispatch performance placeholder</p>
            <Badge variant="secondary">ETA accuracy foundation</Badge>
          </div>
          <OperationalBarChart values={[28, 31, 34, 26, 42, 38, 30, 35, 29, 33, 41, 36]} />
        </div>
        <div className="space-y-2">
          {all.map((delivery) => (
            <div key={delivery.id} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-primary-text">{delivery.orderCode}</p>
                <DeliveryStatusBadge status={delivery.status} />
              </div>
              <p className="mt-1 text-xs text-secondary-text">
                {delivery.vendorName} · {delivery.partner.name} · ETA {delivery.etaWindow} · {delivery.shipment.syncStatus.replace("_", " ")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Truck; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-slate-50 p-3">
      <Icon className="size-4 text-emerald-700" />
      <p className="mt-2 text-xs font-medium uppercase text-secondary-text">{label}</p>
      <p className="mt-1 text-xl font-semibold text-primary-text">{value}</p>
    </div>
  );
}
