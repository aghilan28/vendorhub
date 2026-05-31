"use client";

// MCP-0F.11 — Commerce Governance Center (admin).
// Monitor orders, payments, refunds, deliveries, disputes, failures and
// marketplace throughput; review transaction-intelligence risks and the
// resulting actions. Engine-driven; labelled sample before live data.

import { Activity, AlertTriangle, BadgeIndianRupee, PackageCheck, ShieldAlert, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import { STATE_META, paymentGovernanceSignals, type Severity, type TransactionSnapshot, type Tone } from "@/lib/commerce-transaction";

const sevBadge: Record<Severity, "default" | "secondary" | "warning" | "danger" | "ai"> = {
  info: "secondary",
  opportunity: "ai",
  watch: "ai",
  warning: "warning",
  critical: "danger",
};
const toneBadge: Record<Tone, "default" | "warning" | "danger"> = { healthy: "default", watch: "warning", degraded: "warning", critical: "danger" };

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warning" | "danger" }) {
  const color = tone === "danger" ? "text-red-600" : tone === "warning" ? "text-amber-600" : "text-primary-text";
  return (
    <div className="operational-surface rounded-lg p-4">
      <p className="text-xs text-secondary-text">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

export function CommerceGovernanceCenter({ snapshot, sampled }: { snapshot: TransactionSnapshot; sampled: boolean }) {
  const { intelligence, payment, fulfillment, delivery, postPurchase, orders } = snapshot;
  const t = intelligence.throughput;
  const paymentSignals = paymentGovernanceSignals(payment);
  const stateCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.state] = (acc[o.state] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-primary-text">Commerce Governance Center</h1>
          <p className="text-sm text-secondary-text">Orders, payments, refunds, deliveries, disputes and marketplace throughput in one operable view.</p>
        </div>
        <Badge variant={sampled ? "warning" : "default"}>{sampled ? "Preview (sample data)" : "Live data"}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Commerce health" value={`${intelligence.score}/100`} tone={intelligence.tone === "critical" ? "danger" : intelligence.tone === "healthy" ? undefined : "warning"} />
        <Stat label="GMV" value={`₹${t.gmv.toLocaleString("en-IN")}`} />
        <Stat label="Fulfillment rate" value={`${t.fulfillmentRate}%`} tone={t.fulfillmentRate < 70 ? "warning" : undefined} />
        <Stat label="Payment success" value={`${payment.successRate}%`} tone={payment.failureRate >= 20 ? "danger" : undefined} />
      </div>

      <Tabs defaultValue="risks">
        <TabsList>
          <TabsTrigger value="risks">Risks</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
          <TabsTrigger value="postpurchase">Post-purchase</TabsTrigger>
        </TabsList>

        <TabsContent value="risks">
          <GovernanceCard title="Transaction risks & actions" description="Detected on real orders, payments and shipments. Ranked by impact." action={<ShieldAlert className="size-4 text-secondary-text" />}>
            {intelligence.risks.length ? (
              <ul className="space-y-2">
                {intelligence.risks.map((risk) => (
                  <li key={risk.id} className="rounded-md border border-border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={sevBadge[risk.severity]}>{risk.kind.replace(/_/g, " ")}</Badge>
                      <span className="text-sm font-medium text-primary-text">{risk.title}</span>
                      <span className="text-xs text-secondary-text">score {risk.score}</span>
                    </div>
                    <p className="mt-1 text-xs text-secondary-text">{risk.detail}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand"><Activity className="size-3" /> {risk.recommendedAction}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-secondary-text">No transaction risks detected — the commerce loop is healthy.</p>
            )}
          </GovernanceCard>
        </TabsContent>

        <TabsContent value="orders">
          <GovernanceCard title="Order throughput" description={`${t.orders} orders · AOV ₹${t.averageOrderValue.toLocaleString("en-IN")}`} action={<PackageCheck className="size-4 text-secondary-text" />}>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Placed→Confirmed" value={`${t.placedToConfirmed}%`} />
              <Stat label="Shipped→Delivered" value={`${t.shippedToDelivered}%`} />
              <Stat label="Cancellation" value={`${t.cancellationRate}%`} tone={t.cancellationRate > 10 ? "warning" : undefined} />
              <Stat label="Return rate" value={`${t.returnRate}%`} tone={t.returnRate > 10 ? "warning" : undefined} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(stateCounts).map(([state, count]) => (
                <Badge key={state} variant="secondary">{STATE_META[state as keyof typeof STATE_META]?.label ?? state}: {count}</Badge>
              ))}
            </div>
          </GovernanceCard>
        </TabsContent>

        <TabsContent value="payments">
          <GovernanceCard title="Payment governance" description={`${payment.total} attempts · ${payment.successRate}% success · ${payment.codShare}% COD`} action={<BadgeIndianRupee className="size-4 text-secondary-text" />}>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {payment.methodMix.map((m) => (
                <Badge key={m.method} variant="secondary">{m.method.toUpperCase()}: {m.share}%</Badge>
              ))}
            </div>
            {paymentSignals.length ? (
              <ul className="space-y-1">
                {paymentSignals.map((signal, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-amber-700"><AlertTriangle className="mt-0.5 size-3 shrink-0" /> {signal}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-secondary-text">Payments are healthy. No governance signals.</p>
            )}
          </GovernanceCard>
        </TabsContent>

        <TabsContent value="delivery">
          <GovernanceCard title="Delivery & couriers" description={`${delivery.delivered}/${delivery.shipments} delivered · ${delivery.onTimePct}% on time`} action={<Truck className="size-4 text-secondary-text" />}>
            <div className="space-y-2">
              {fulfillment.couriers.map((c) => (
                <div key={c.courier} className="flex items-center justify-between gap-2 rounded-md border border-border p-3 text-sm">
                  <span className="font-medium text-primary-text">{c.courier}</span>
                  <span className="flex items-center gap-2 text-secondary-text">{c.shipments} shipments · {c.delayed} delayed <Badge variant={toneBadge[c.tone]}>{c.onTimePct}%</Badge></span>
                </div>
              ))}
              {fulfillment.couriers.length === 0 ? <p className="text-sm text-secondary-text">No delivery activity yet.</p> : null}
            </div>
          </GovernanceCard>
        </TabsContent>

        <TabsContent value="postpurchase">
          <GovernanceCard title="Returns, refunds & support" action={<ShieldAlert className="size-4 text-secondary-text" />}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Stat label="Open returns" value={String(postPurchase.openReturns)} />
              <Stat label="Open refunds" value={String(postPurchase.openRefunds)} />
              <Stat label="Refunded ₹" value={`₹${postPurchase.refundedValue.toLocaleString("en-IN")}`} />
              <Stat label="Open tickets" value={String(postPurchase.openTickets)} />
              <Stat label="Open disputes" value={String(postPurchase.openDisputes)} tone={postPurchase.openDisputes ? "danger" : undefined} />
              <Stat label="Resolved returns" value={String(postPurchase.resolvedReturns)} />
            </div>
          </GovernanceCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
