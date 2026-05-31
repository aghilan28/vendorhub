"use client";

// MCP-0F.6 — Fulfillment Command Center (seller).
// Accept → pack → dispatch → track → resolve, with SLA/breach state, courier
// health and delivery performance. Engine-driven; falls back to a labelled
// sample before sign-in. Order commits reuse the real seller order action.

import { AlertTriangle, Boxes, PackageCheck, Truck, Timer, Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import { STATE_META, fulfillmentActions, type FulfillmentAction, type TransactionSnapshot, type Tone } from "@/lib/commerce-transaction";

const toneBadge: Record<Tone, "default" | "warning" | "danger" | "secondary"> = {
  healthy: "default",
  watch: "warning",
  degraded: "warning",
  critical: "danger",
};

const actionLabel: Record<FulfillmentAction, string> = {
  accept: "Accept order",
  pack: "Pack items",
  dispatch: "Dispatch",
  deliver: "Mark delivered",
  resolve: "Resolve issue",
  none: "—",
};

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warning" | "danger" }) {
  const color = tone === "danger" ? "text-red-600" : tone === "warning" ? "text-amber-600" : "text-primary-text";
  return (
    <div className="operational-surface rounded-lg p-4">
      <p className="text-xs text-secondary-text">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

export function FulfillmentCommandCenter({ snapshot, sampled }: { snapshot: TransactionSnapshot; sampled: boolean }) {
  const { tasks, fulfillment, delivery } = snapshot;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-primary-text">Fulfillment Command Center</h1>
          <p className="text-sm text-secondary-text">Accept, pack, dispatch and track every order — with live SLA and courier health.</p>
        </div>
        <Badge variant={sampled ? "warning" : "default"}>{sampled ? "Preview (sample data)" : "Live data"}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Open tasks" value={String(fulfillment.openTasks)} />
        <Stat label="SLA breaches" value={String(fulfillment.breaches)} tone={fulfillment.breaches ? "danger" : undefined} />
        <Stat label="At risk" value={String(fulfillment.atRisk)} tone={fulfillment.atRisk ? "warning" : undefined} />
        <Stat label="On-time delivery" value={`${fulfillment.onTimePct}%`} tone={fulfillment.onTimePct < 85 ? "warning" : undefined} />
      </div>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="couriers">Couriers</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
          <GovernanceCard title="Fulfillment queue" description="Breached and ageing orders first." action={<PackageCheck className="size-4 text-secondary-text" />}>
            {tasks.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-secondary-text">
                    <tr>
                      <th className="py-2 pr-3">Order</th>
                      <th className="py-2 pr-3">Stage</th>
                      <th className="py-2 pr-3">Next action</th>
                      <th className="py-2 pr-3">Age / SLA</th>
                      <th className="py-2 pr-3">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => {
                      const onward = fulfillmentActions(task.state).map((s) => STATE_META[s].label).join(" → ") || "—";
                      return (
                        <tr key={task.orderId} className="border-t border-border">
                          <td className="py-2 pr-3 font-medium text-primary-text">{task.orderNumber}<span className="block text-xs text-secondary-text">{task.sellerName}</span></td>
                          <td className="py-2 pr-3"><Badge variant="secondary">{STATE_META[task.state].label}</Badge></td>
                          <td className="py-2 pr-3"><span className="font-medium text-brand">{actionLabel[task.nextAction]}</span><span className="block text-xs text-secondary-text">{onward}</span></td>
                          <td className="py-2 pr-3">
                            {task.breached ? <Badge variant="danger"><Timer className="size-3" /> breached</Badge> : task.atRisk ? <Badge variant="warning"><Timer className="size-3" /> {task.ageMinutes}/{task.slaMinutes}m</Badge> : <span className="text-xs text-secondary-text">{task.ageMinutes}/{task.slaMinutes}m</span>}
                          </td>
                          <td className="py-2 pr-3 text-secondary-text">₹{task.total.toLocaleString("en-IN")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-secondary-text">No open fulfillment tasks. New orders appear here for acceptance.</p>
            )}
          </GovernanceCard>
        </TabsContent>

        <TabsContent value="health">
          <GovernanceCard title="Fulfillment health" description={`Overall score ${fulfillment.score}/100.`} action={<Gauge className="size-4 text-secondary-text" />}>
            <div className="mb-4 flex items-center gap-2">
              <span className="text-3xl font-semibold text-primary-text">{fulfillment.score}</span>
              <Badge variant={toneBadge[fulfillment.tone]}>{fulfillment.tone}</Badge>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {fulfillment.byState.map((s) => (
                <Badge key={s.state} variant="secondary">{STATE_META[s.state].label}: {s.count}</Badge>
              ))}
              {fulfillment.byState.length === 0 ? <p className="text-sm text-secondary-text">No open orders by state.</p> : null}
            </div>
          </GovernanceCard>
        </TabsContent>

        <TabsContent value="couriers">
          <GovernanceCard title="Courier health" description="On-time performance by courier." action={<Truck className="size-4 text-secondary-text" />}>
            <div className="space-y-2">
              {fulfillment.couriers.map((c) => (
                <div key={c.courier} className="flex items-center justify-between gap-2 rounded-md border border-border p-3 text-sm">
                  <span className="font-medium text-primary-text">{c.courier}</span>
                  <span className="flex items-center gap-2 text-secondary-text">{c.shipments} shipments · {c.delayed} delayed <Badge variant={toneBadge[c.tone]}>{c.onTimePct}%</Badge></span>
                </div>
              ))}
              {fulfillment.couriers.length === 0 ? <p className="text-sm text-secondary-text">No courier activity yet.</p> : null}
            </div>
          </GovernanceCard>
        </TabsContent>

        <TabsContent value="delivery">
          <GovernanceCard title="Delivery performance" action={<Boxes className="size-4 text-secondary-text" />}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Shipments" value={String(delivery.shipments)} />
              <Stat label="Delivered" value={String(delivery.delivered)} />
              <Stat label="Delayed" value={String(delivery.delayed)} tone={delivery.delayed ? "warning" : undefined} />
              <Stat label="Avg delay" value={`${delivery.avgDelayMinutes}m`} tone={delivery.avgDelayMinutes ? "warning" : undefined} />
            </div>
            {fulfillment.breaches > 0 ? (
              <p className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-amber-700"><AlertTriangle className="size-3" /> {fulfillment.breaches} order(s) past SLA need dispatch attention.</p>
            ) : null}
          </GovernanceCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
