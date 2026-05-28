"use client";

import Link from "next/link";
import { ClipboardCheck, FileText, PackageCheck } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/formatting/currency";
import { fetchJson, type ApiEnvelope } from "@/lib/api/client";
import { OrderStatus } from "@/types";
import { getNextSellerStatuses, orderStatusLabels } from "@/features/transactions/lifecycle";
import { SellerDispatchPanel } from "@/features/logistics/components/seller-dispatch-panel";
import { useSellerOrders } from "../queries";
import { useSellerStore } from "../store";
import type { SellerOrder, SellerOrderStatus } from "../types";
import { OperationalTable, type OperationalColumn } from "./operational-table";
import { StatusBadge } from "./status-badge";

const orderStates: Array<SellerOrderStatus | "all"> = ["all", "pending", "confirmed", "processing", "packed", "shipped", "out_for_delivery", "delivered", "cancelled", "refunded"];

function toOrderStatus(status: SellerOrderStatus): OrderStatus {
  return status.toUpperCase() as OrderStatus;
}

export function OrdersScreen() {
  const { data: orders = [], isLoading } = useSellerOrders();
  const queryClient = useQueryClient();
  const status = useSellerStore((state) => state.orderStatus);
  const setStatus = useSellerStore((state) => state.setOrderStatus);
  const transition = useMutation({
    mutationFn: ({ orderId, next }: { orderId: string; next: OrderStatus }) =>
      fetchJson<ApiEnvelope<{ ok: boolean }>>(`/api/seller/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: next, note: `Seller moved order to ${orderStatusLabels[next].toLowerCase()}.` }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["seller"] });
    },
  });
  const rows: SellerOrder[] = orders.filter((order) => status === "all" || order.status === status);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SellerDispatchPanel />
        <EmptyState icon={ClipboardCheck} title="Loading orders" description="Fetching live seller order state." />
      </div>
    );
  }

  const columns: OperationalColumn<SellerOrder>[] = [
    { key: "order", header: "Order", sortLabel: "Sort order", render: (order) => <Link href={`/seller/orders/${order.id}`} className="block rounded-sm focus-ring"><p className="font-medium text-primary-text">{order.id}</p><p className="text-xs text-secondary-text">{order.createdAt}</p></Link> },
    { key: "customer", header: "Customer", render: (order) => <div><p>{order.customer}</p><p className="text-xs text-secondary-text">{order.phone}</p></div> },
    { key: "status", header: "Status", render: (order) => <StatusBadge status={order.status} /> },
    { key: "payment", header: "Payment", render: (row) => row.paymentMode },
    { key: "sla", header: "SLA", sortLabel: "Sort SLA", render: (order) => <span className={order.promisedInMinutes <= 15 ? "font-semibold text-danger" : "font-medium text-primary-text"}>{order.promisedInMinutes} min</span> },
    { key: "items", header: "Items", render: (order) => `${order.items.length} lines` },
    { key: "total", header: "Total", render: (order) => formatCurrency(order.subtotal + order.deliveryFee) },
    { key: "actions", header: "Actions", render: (row) => {
      const next = getNextSellerStatuses(toOrderStatus(row.status))[0];
      const orderId = row.dbId ?? row.id;
      return (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary">Stock aware</Button>
          <Button size="sm" disabled={!next || transition.isPending} onClick={() => next && transition.mutate({ orderId, next })}>
            <PackageCheck /> {next ? orderStatusLabels[next] : "Locked"}
          </Button>
        </div>
      );
    } },
  ];

  return (
    <div className="space-y-6">
      <SellerDispatchPanel />
      <OperationalTable
        title="Order management"
        description="Fulfillment-first order queue with status filtering, SLA visibility, and action-ready rows."
        rows={rows}
        columns={columns}
        empty={<EmptyState icon={ClipboardCheck} title="No orders in this state" description="The selected workflow state has no orders waiting." />}
        actions={
          <div className="flex gap-2">
            <Select value={status} onValueChange={(value) => setStatus(value as SellerOrderStatus | "all")}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {orderStates.map((state) => <SelectItem key={state} value={state}>{state.replaceAll("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="secondary"><FileText /> Export</Button>
          </div>
        }
      />
    </div>
  );
}
