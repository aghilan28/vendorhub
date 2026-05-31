"use client";

// MCP-0F.10 — Buyer Order Center.
// My Orders · Tracking · Returns/Refunds · Reviews · Support · Analytics, with
// reorder and invoice links. Engine-driven (lifecycle progress, tracking view,
// return eligibility); labelled sample before sign-in.

import Link from "next/link";
import { useMemo } from "react";
import { Boxes, FileText, PackageCheck, RotateCcw, Star, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import {
  STATE_META,
  buildTrackingView,
  lifecycleProgress,
  returnEligibility,
  type TransactionSnapshot,
  type Tone,
} from "@/lib/commerce-transaction";

const toneBar: Record<Tone, string> = {
  healthy: "bg-emerald-500",
  watch: "bg-amber-500",
  degraded: "bg-amber-500",
  critical: "bg-red-500",
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="operational-surface rounded-lg p-4">
      <p className="text-xs text-secondary-text">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-primary-text">{value}</p>
    </div>
  );
}

export function BuyerOrderCenter({ snapshot, sampled }: { snapshot: TransactionSnapshot; sampled: boolean }) {
  const { orders, shipments, postPurchase, intelligence } = snapshot;
  const now = useMemo(() => new Date().toISOString(), []);
  const couriers = snapshot.fulfillment.couriers;

  const trackable = shipments.filter((s) => s.state !== "completed");
  const settledOrders = orders.filter((o) => o.state === "delivered" || o.state === "completed");
  const totalSpend = orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-primary-text">Order Center</h1>
          <p className="text-sm text-secondary-text">Track orders, deliveries, returns, refunds, support and reviews — and reorder in one tap.</p>
        </div>
        <Badge variant={sampled ? "warning" : "default"}>{sampled ? "Preview (sample data)" : "Live data"}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Orders" value={String(orders.length)} />
        <Stat label="In transit" value={String(trackable.length)} />
        <Stat label="Open returns" value={String(postPurchase.openReturns)} />
        <Stat label="Total spend" value={`₹${totalSpend.toLocaleString("en-IN")}`} />
      </div>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">My Orders</TabsTrigger>
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
          <TabsTrigger value="returns">Returns & Refunds</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <GovernanceCard title="My orders" description="Lifecycle progress, invoices and reorder." action={<PackageCheck className="size-4 text-secondary-text" />}>
            <div className="space-y-3">
              {orders.map((order) => {
                const meta = STATE_META[order.state];
                const progress = lifecycleProgress(order.state);
                const eligibility = returnEligibility(order, now);
                return (
                  <div key={order.id} className="rounded-md border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-primary-text">{order.orderNumber} · {order.sellerName}</p>
                        <p className="text-xs text-secondary-text">{order.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={meta.tone === "critical" ? "danger" : meta.tone === "degraded" ? "warning" : "default"}>{meta.buyerLabel}</Badge>
                        <p className="mt-1 text-sm font-semibold text-primary-text">₹{order.total.toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full ${toneBar[meta.tone]}`} style={{ width: `${progress}%` }} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <Link href={`/orders/${order.id}`} className="font-medium text-brand">View details</Link>
                      <Link href={`/tracking/${order.id}`} className="inline-flex items-center gap-1 text-secondary-text"><Truck className="size-3" /> Track</Link>
                      <Link href={`/api/invoices/${order.id}`} className="inline-flex items-center gap-1 text-secondary-text"><FileText className="size-3" /> Invoice</Link>
                      <Link href="/products" className="inline-flex items-center gap-1 text-secondary-text"><RotateCcw className="size-3" /> Reorder</Link>
                      {eligibility.eligible ? <span className="text-emerald-700">{eligibility.reason}</span> : null}
                    </div>
                  </div>
                );
              })}
              {orders.length === 0 ? <p className="text-sm text-secondary-text">No orders yet. Your purchases will appear here.</p> : null}
            </div>
          </GovernanceCard>
        </TabsContent>

        <TabsContent value="tracking">
          <GovernanceCard title="Live tracking" description="ETA, delays and delivery confidence." action={<Truck className="size-4 text-secondary-text" />}>
            <div className="space-y-3">
              {trackable.map((shipment) => {
                const view = buildTrackingView(shipment, { courierHealth: couriers, now });
                return (
                  <div key={shipment.id} className="rounded-md border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-primary-text">{view.orderNumber} · {view.courier}</p>
                      <Badge variant={view.delayed ? "danger" : "default"}>{view.stageLabel}</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-secondary-text">
                      <span>ETA: {view.etaMinutes === null ? "—" : `${view.etaMinutes} min`}</span>
                      <span>{view.delayed ? `Delayed ${view.delayMinutes} min` : "On schedule"}</span>
                      <span>Confidence: {view.confidence}%</span>
                    </div>
                    <ol className="mt-3 space-y-1 border-l border-border pl-3 text-xs">
                      {view.history.map((event, i) => (
                        <li key={i} className="text-secondary-text"><span className="font-medium text-primary-text">{event.label}</span>{event.location ? ` · ${event.location}` : ""}</li>
                      ))}
                    </ol>
                  </div>
                );
              })}
              {trackable.length === 0 ? <p className="text-sm text-secondary-text">No active shipments to track.</p> : null}
            </div>
          </GovernanceCard>
        </TabsContent>

        <TabsContent value="returns">
          <GovernanceCard title="Returns & refunds" description="Eligibility and resolution status." action={<RotateCcw className="size-4 text-secondary-text" />}>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Open returns" value={String(postPurchase.openReturns)} />
              <Stat label="Resolved returns" value={String(postPurchase.resolvedReturns)} />
              <Stat label="Open refunds" value={String(postPurchase.openRefunds)} />
              <Stat label="Refunded ₹" value={`₹${postPurchase.refundedValue.toLocaleString("en-IN")}`} />
            </div>
            <div className="space-y-2">
              {settledOrders.map((order) => {
                const e = returnEligibility(order, now);
                return (
                  <div key={order.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-3 text-sm">
                    <span className="text-primary-text">{order.orderNumber}</span>
                    {e.eligible ? <Badge variant="default">{e.reason}</Badge> : <Badge variant="secondary">{e.reason}</Badge>}
                  </div>
                );
              })}
              {settledOrders.length === 0 ? <p className="text-sm text-secondary-text">Returns open after your orders are delivered.</p> : null}
            </div>
          </GovernanceCard>
        </TabsContent>

        <TabsContent value="reviews">
          <GovernanceCard title="Reviews" description="Delivered orders you can rate." action={<Star className="size-4 text-secondary-text" />}>
            <p className="mb-3 text-sm text-secondary-text">{postPurchase.reviewable} order(s) are ready for a review. Reviews feed the MCP-0D trust layer.</p>
            <div className="space-y-2">
              {settledOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-3 text-sm">
                  <span className="text-primary-text">{order.orderNumber} · {order.sellerName}</span>
                  <Link href={`/product/${order.items[0]?.sku ?? ""}`} className="font-medium text-brand">Write a review</Link>
                </div>
              ))}
              {settledOrders.length === 0 ? <p className="text-sm text-secondary-text">No reviewable orders yet.</p> : null}
            </div>
          </GovernanceCard>
        </TabsContent>

        <TabsContent value="analytics">
          <GovernanceCard title="Order analytics" action={<Boxes className="size-4 text-secondary-text" />}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Orders" value={String(intelligence.throughput.orders)} />
              <Stat label="Avg order value" value={`₹${intelligence.throughput.averageOrderValue.toLocaleString("en-IN")}`} />
              <Stat label="Fulfillment rate" value={`${intelligence.throughput.fulfillmentRate}%`} />
              <Stat label="Total spend" value={`₹${totalSpend.toLocaleString("en-IN")}`} />
            </div>
          </GovernanceCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
