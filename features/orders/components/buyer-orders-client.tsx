"use client";

import Link from "next/link";
import { CreditCard, FileText, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { OrderStatusPill } from "@/components/commerce/order-status-pill";
import { PriceDisplay } from "@/components/commerce/price-display";
import { EmptyState } from "@/components/feedback/empty-state";
import { LiveStateBadge } from "@/components/realtime/live-state-badge";
import { Button } from "@/components/ui/button";
import { PaymentStateIndicator } from "@/features/transactions/components/payment-state-indicator";
import { useTransactionOrders } from "@/features/transactions/queries";
import { seedDeliveries } from "@/features/logistics/data";
import { DeliveryStatusBadge } from "@/features/logistics/components/delivery-status-badge";

export function BuyerOrdersClient() {
  const { data: orders = [] } = useTransactionOrders();

  if (!orders.length) {
    return <EmptyState icon={PackageCheck} title="No orders yet" description="Placed orders will appear with payment state, seller progress, and transaction references." />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <LiveStateBadge />
      </div>
      {orders.map((order) => (
        <article key={order.id} className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-semibold text-primary-text">{order.code}</h2>
              <p className="mt-1 text-sm text-secondary-text">{order.items.length} items from {order.items[0]?.product.vendor.name}</p>
              <p className="mt-1 text-xs text-secondary-text">Txn {order.payment.reference} · Invoice {order.invoice?.invoiceNumber ?? order.invoiceState}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <OrderStatusPill status={order.status} />
              <PaymentStateIndicator status={order.payment.status} />
              {seedDeliveries.find((delivery) => delivery.orderId === order.id) ? <DeliveryStatusBadge status={seedDeliveries.find((delivery) => delivery.orderId === order.id)!.status} /> : null}
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                <span className="text-primary-text">{item.product.name}</span>
                <span className="text-secondary-text">x{item.quantity}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-4 text-sm text-secondary-text">
              <span className="inline-flex items-center gap-1"><PackageCheck className="size-4 text-brand" /> Inventory committed</span>
              <span className="inline-flex items-center gap-1"><CreditCard className="size-4 text-brand" /> {order.payment.method.toUpperCase()} visible</span>
              <span className="inline-flex items-center gap-1"><ShieldCheck className="size-4 text-brand" /> GST invoice ready</span>
              <span className="inline-flex items-center gap-1"><Truck className="size-4 text-brand" /> ETA {seedDeliveries.find((delivery) => delivery.orderId === order.id)?.etaWindow ?? "pending"}</span>
            </div>
            <div className="flex items-center gap-2">
              <PriceDisplay value={order.total} currency={order.currency} />
              {order.invoice ? <Button variant="outline" size="sm" asChild><a href={order.invoice.pdfUrl}><FileText /> Invoice</a></Button> : null}
              <Button variant="secondary" size="sm" asChild><Link href={`/orders/${order.id}`}>View details</Link></Button>
              <Button size="sm" asChild><Link href={`/tracking/${order.id}`}>Track</Link></Button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
