"use client";

import { useState } from "react";
import { CreditCard, FileText, LifeBuoy, MapPin, PackageX, ReceiptText, RotateCcw } from "lucide-react";
import { notFound } from "next/navigation";
import { OrderStatusPill } from "@/components/commerce/order-status-pill";
import { PriceDisplay } from "@/components/commerce/price-display";
import { PageContainer } from "@/components/layout/page-container";
import { SectionWrapper } from "@/components/layout/section-wrapper";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrderStatus } from "@/types";
import { useCheckoutStore } from "@/store/checkout-store";
import { PaymentStateIndicator } from "@/features/transactions/components/payment-state-indicator";
import { TransactionSummary } from "@/features/transactions/components/transaction-summary";
import { OrderTimeline } from "@/features/transactions/components/order-timeline";
import { useTransactionOrder } from "@/features/transactions/queries";
import { getPaymentRecoveryState } from "@/features/commerce-finance/recovery";

export function OrderDetailClient({ id }: { id: string }) {
  const { data: order } = useTransactionOrder(id);
  const cancelOrder = useCheckoutStore((state) => state.cancelOrder);
  const requestRefund = useCheckoutStore((state) => state.requestRefund);
  const retryPayment = useCheckoutStore((state) => state.retryPayment);
  const [reason, setReason] = useState("Customer requested cancellation before shipment.");
  const [refundReason, setRefundReason] = useState("Refund review placeholder for item quality issue.");

  if (!order) notFound();

  const canCancel = ![OrderStatus.Shipped, OrderStatus.OutForDelivery, OrderStatus.Delivered, OrderStatus.Cancelled, OrderStatus.Refunded].includes(order.status);
  const canRefund = [OrderStatus.Delivered, OrderStatus.Cancelled].includes(order.status);
  const recovery = getPaymentRecoveryState(order.payment.status, order.payment.method);

  return (
    <PageContainer className="space-y-6">
      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-secondary-text">Order detail</p>
            <h1 className="mt-1 text-2xl font-semibold text-primary-text">{order.code}</h1>
            <p className="mt-1 text-sm text-secondary-text">Support {order.supportReference} · Transaction {order.payment.reference}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <OrderStatusPill status={order.status} />
            <PaymentStateIndicator status={order.payment.status} />
          </div>
        </div>
      </section>

      {order.cancellation ? <Alert title="Cancellation recorded" variant="warning">{order.cancellation.reason}</Alert> : null}
      {order.refund ? <Alert title="Refund review placeholder active" variant="info">{order.refund.reason}</Alert> : null}
      <Alert title={recovery.title} variant={order.payment.status === "FAILED" ? "danger" : order.payment.status === "SUCCEEDED" ? "success" : "info"}>
        <p>{recovery.message}</p>
        <p className="mt-1 font-medium">{recovery.action}</p>
      </Alert>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <SectionWrapper title="Items" description="Order items preserve seller, price, inventory, and quantity context.">
          <div className="space-y-3">
            {order.items.map((item) => (
              <article key={item.id} className="rounded-lg border border-border bg-surface p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-primary-text">{item.product.name}</h2>
                    <p className="mt-1 text-sm text-secondary-text">{item.product.vendor.name} · {item.product.unit} · Qty {item.quantity}</p>
                  </div>
                  <PriceDisplay value={item.product.price * item.quantity} currency={item.product.currency} />
                </div>
              </article>
            ))}
          </div>
        </SectionWrapper>
        <div className="space-y-4">
          <TransactionSummary pricing={order.pricing} itemCount={order.items.length} />
          <aside className="rounded-lg border border-border bg-surface p-4 text-sm shadow-sm">
            <h2 className="font-semibold text-primary-text">Transaction visibility</h2>
            <div className="mt-4 space-y-2 text-secondary-text">
              <p className="flex items-center gap-2"><CreditCard className="size-4 text-brand" /> {order.payment.method.toUpperCase()} reference {order.payment.reference}</p>
              <p className="flex items-center gap-2"><ReceiptText className="size-4 text-brand" /> GST invoice {order.invoice?.invoiceNumber ?? order.invoiceState.replaceAll("_", " ")}</p>
              {order.settlement ? <p className="flex items-center gap-2"><FileText className="size-4 text-brand" /> Settlement {order.settlement.reference} · {order.settlement.status}</p> : null}
              <p className="flex items-center gap-2"><MapPin className="size-4 text-brand" /> {order.deliveryAddress.locality}, {order.deliveryAddress.city}</p>
              <p className="flex items-center gap-2"><LifeBuoy className="size-4 text-brand" /> {order.supportReference}</p>
            </div>
            {order.invoice ? <Button className="mt-4 w-full" variant="secondary" asChild><a href={order.invoice.pdfUrl}><ReceiptText /> Download invoice</a></Button> : null}
          </aside>
        </div>
      </div>

      {order.invoice ? (
        <SectionWrapper title="GST invoice" description="Professional India tax invoice with seller GSTIN, buyer details, HSN/SAC placeholders, and payment reference.">
          <div className="grid gap-3 rounded-lg border border-border bg-surface p-4 text-sm shadow-sm md:grid-cols-4">
            <div><p className="text-xs text-secondary-text">Invoice</p><p className="mt-1 font-semibold text-primary-text">{order.invoice.invoiceNumber}</p></div>
            <div><p className="text-xs text-secondary-text">Seller GSTIN</p><p className="mt-1 font-semibold text-primary-text">{order.invoice.seller.gstin ?? "Pending"}</p></div>
            <div><p className="text-xs text-secondary-text">CGST + SGST</p><p className="mt-1 font-semibold text-primary-text">Rs {order.invoice.cgst + order.invoice.sgst}</p></div>
            <div><p className="text-xs text-secondary-text">Status</p><p className="mt-1 font-semibold text-primary-text">{order.invoice.status.replaceAll("_", " ")}</p></div>
          </div>
        </SectionWrapper>
      ) : null}

      <SectionWrapper title="Status timeline" description="Deterministic lifecycle history with timestamps and operational notes.">
        <OrderTimeline history={order.history} />
      </SectionWrapper>

      <SectionWrapper title="Cancellation and refund" description="Foundational recovery workflows with auditable placeholders.">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <h2 className="flex items-center gap-2 font-semibold text-primary-text"><PackageX className="size-4" /> Cancellation request</h2>
            <Input className="mt-3" value={reason} onChange={(event) => setReason(event.target.value)} disabled={!canCancel} />
            <Button className="mt-3" variant="secondary" disabled={!canCancel} onClick={() => cancelOrder(order.id, reason)}>Confirm cancellation</Button>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <h2 className="flex items-center gap-2 font-semibold text-primary-text"><RotateCcw className="size-4" /> Refund foundation</h2>
            <Input className="mt-3" value={refundReason} onChange={(event) => setRefundReason(event.target.value)} disabled={!canRefund} />
            <Button className="mt-3" variant="secondary" disabled={!canRefund} onClick={() => requestRefund(order.id, refundReason)}>Request refund review</Button>
          </div>
        </div>
        {order.payment.status === "FAILED" ? (
          <Button className="mt-4" onClick={() => retryPayment(order.id)}><CreditCard /> Retry payment</Button>
        ) : null}
        <div className="mt-4 rounded-lg border border-border bg-surface p-4 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold text-primary-text"><FileText className="size-4" /> Audit trail</h2>
          <div className="mt-3 grid gap-2">
            {order.auditTrail.map((entry) => (
              <p key={entry.id} className="rounded-md bg-slate-50 px-3 py-2 text-sm text-secondary-text">{entry.action.replaceAll("_", " ")} · {new Date(entry.createdAt).toLocaleString("en-IN")}</p>
            ))}
          </div>
        </div>
      </SectionWrapper>
    </PageContainer>
  );
}
