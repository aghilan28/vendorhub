"use client";

import { AlertTriangle, ClipboardCheck, PackageCheck, Truck } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { createMutationRequest } from "@/lib/api/client";
import { useDeliveryStore } from "@/store/delivery-store";
import { useDispatchQueue } from "../queries";
import { deliveryStatusLabels, getNextDeliveryStatuses } from "../status-engine";
import type { Delivery } from "../types";
import { DeliveryStatusBadge } from "./delivery-status-badge";

export function SellerDispatchPanel() {
  const { data, isLoading, isError } = useDispatchQueue();
  const status = useDeliveryStore((state) => state.dispatchStatus);
  const setStatus = useDeliveryStore((state) => state.setDispatchStatus);

  if (isLoading) return <div className="h-56 animate-pulse rounded-lg border border-border bg-slate-100" aria-label="Loading dispatch queue" />;
  if (isError || !data) return <EmptyState icon={AlertTriangle} title="Dispatch queue unavailable" description="Delivery operations are temporarily using cached order status." />;

  const deliveries = [...data.pending, ...data.active, ...data.failed].filter((delivery) => status === "all" || delivery.status === status);

  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-semibold text-primary-text">Dispatch management</h2>
          <p className="mt-1 text-sm text-secondary-text">Pending dispatch, active deliveries, failed attempts, and manual self-delivery updates.</p>
        </div>
        <select value={status} onChange={(event) => setStatus(event.target.value as never)} className="focus-ring h-10 rounded-md border border-border bg-surface px-3 text-sm" aria-label="Filter delivery status">
          <option value="all">All deliveries</option>
          {Object.entries(deliveryStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      {deliveries.length ? (
        <div className="mt-4 grid gap-3">
          {deliveries.map((delivery) => <DispatchCard key={delivery.id} delivery={delivery} />)}
        </div>
      ) : (
        <div className="mt-4">
          <EmptyState icon={ClipboardCheck} title="No dispatches in this state" description="Delivery tasks will appear when orders move into fulfillment." />
        </div>
      )}
    </section>
  );
}

function DispatchCard({ delivery }: { delivery: Delivery }) {
  const next = getNextDeliveryStatuses(delivery.status);
  const queryClient = useQueryClient();
  const transition = useMutation({
    mutationFn: createMutationRequest<{ toStatus: Delivery["status"]; note: string }, unknown>(`/api/logistics/deliveries/${delivery.id}`, "PATCH"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["logistics"] });
    },
  });

  return (
    <article className="grid gap-3 rounded-md border border-border p-3 lg:grid-cols-[1fr_auto]">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-primary-text">{delivery.orderCode}</p>
          <DeliveryStatusBadge status={delivery.status} />
        </div>
        <p className="mt-1 text-sm text-secondary-text">
          {delivery.buyerName} · {delivery.deliveryAddress} · ETA {delivery.etaWindow}
        </p>
        <p className="mt-1 text-xs text-secondary-text">
          {delivery.partner.name} · {delivery.assignedTo ?? "assignment pending"} · {delivery.shipment.syncStatus.replace("_", " ")}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 lg:justify-end">
        <Button size="sm" variant="secondary"><Truck /> Assign method</Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={delivery.status !== "DELIVERY_PENDING" || transition.isPending}
          onClick={() => transition.mutate({ toStatus: "READY_FOR_DISPATCH", note: "Seller confirmed package is ready for dispatch." })}
        >
          <PackageCheck /> Ready pickup
        </Button>
        <Button
          size="sm"
          disabled={!next.length || transition.isPending}
          onClick={() => next[0] && transition.mutate({ toStatus: next[0], note: `Seller advanced delivery to ${deliveryStatusLabels[next[0]].toLowerCase()}.` })}
        >
          {next[0] ? deliveryStatusLabels[next[0]] : "Closed"}
        </Button>
      </div>
    </article>
  );
}
