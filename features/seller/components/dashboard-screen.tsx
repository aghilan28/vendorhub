"use client";

import { AlertTriangle, Bell, ClipboardCheck, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { OperationalBarChart } from "@/components/charts/operational-bar-chart";
import { ProductionExperiencePanel } from "@/components/experience/production-experience-panel";
import { TrustStrip } from "@/components/experience/trust-strip";
import { LiveEventFeed } from "@/components/realtime/live-event-feed";
import { LiveStateBadge } from "@/components/realtime/live-state-badge";
import { MerchantIntelligencePanel } from "@/features/merchant-intelligence/components/merchant-intelligence-panel";
import { sellerKycProfiles } from "@/features/trust/data";
import { TrustLevelBadge, VerificationStateBadge } from "@/features/trust/components/trust-badges";
import { notifications, sellerProfile, trustSignals } from "../data";
import { useSellerDashboard } from "../queries";
import { inventoryStatus, statusLabel } from "../utils";
import { OperationalCard } from "./operational-card";
import { OperationalMetricCard } from "./operational-metric-card";
import { SellerDashboardSkeleton } from "./loading";
import { StatusBadge } from "./status-badge";

export function SellerDashboardScreen() {
  const { data, isLoading, isError } = useSellerDashboard();

  if (isLoading) return <SellerDashboardSkeleton />;
  if (isError || !data) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Seller operations could not load"
        description="The operational workspace is ready, but the mock query failed. Retry once the local app settles."
        actionLabel="Retry dashboard"
      />
    );
  }

  const lowStock = data.inventory.filter((item) => inventoryStatus(item) === "low_stock" || inventoryStatus(item) === "out_of_stock");
  const activeOrders = data.orders.filter((order) => !["delivered", "cancelled"].includes(order.status));
  const kycProfile = sellerKycProfiles[0];

  return (
    <div className="space-y-6">
      <section className="operational-surface rounded-lg p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-secondary-text">{sellerProfile.zone}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-primary-text">{sellerProfile.storeName} operating workspace</h1>
            <p className="mt-2 max-w-3xl text-sm text-secondary-text">
              Live seller control plane for order acceptance, fulfillment readiness, and inventory reliability.
            </p>
            <div className="mt-3">
              <LiveStateBadge />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {trustSignals.map((signal) => {
              const Icon = signal.icon;
              return (
                <div key={signal.label} className="rounded-md border border-border bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-secondary-text">
                    <Icon className="size-3.5" />
                    {signal.label}
                  </div>
                  <p className="mt-1 text-sm font-medium text-primary-text">{signal.value}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <ProductionExperiencePanel
        compact
        input={{
          persona: "seller",
          realtimeState: "connected",
          operationalPressure: Math.min(100, activeOrders.length * 18 + lowStock.length * 12),
          accessibilityMode: true,
        }}
      />

      <TrustStrip
        label="Seller operational trust indicators"
        items={[
          { label: "Payouts", value: kycProfile.bank.payoutReadiness, icon: ShieldCheck },
          { label: "Inventory", value: `${lowStock.length} items need attention`, icon: AlertTriangle },
          { label: "Fulfillment", value: `${activeOrders.length} active orders`, icon: ClipboardCheck },
          { label: "Compliance", value: kycProfile.verificationState.replace("_", " "), icon: ShieldCheck },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.metrics.map((metric) => (
          <OperationalMetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      {data.intelligence ? <MerchantIntelligencePanel intelligence={data.intelligence} /> : null}

      <OperationalCard title="Compliance health" description="KYC, GST, bank readiness, trust score, and enforcement state.">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs text-secondary-text">Verification</p>
            <div className="mt-2"><VerificationStateBadge state={kycProfile.verificationState} /></div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs text-secondary-text">Trust level</p>
            <div className="mt-2"><TrustLevelBadge level={kycProfile.trustScore.level} /></div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs text-secondary-text">GST</p>
            <p className="mt-2 font-semibold text-primary-text">{kycProfile.gst.invoiceEnabled ? "Invoice enabled" : "Review pending"}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs text-secondary-text">Payout readiness</p>
            <p className="mt-2 font-semibold text-primary-text">{kycProfile.bank.payoutReadiness}</p>
          </div>
        </div>
      </OperationalCard>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <OperationalCard title="Fulfillment queue" description="What requires action now, ordered by SLA pressure.">
          <div className="space-y-3">
            {activeOrders.map((order) => (
              <div key={order.id} className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-primary-text">{order.id}</p>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="mt-1 text-sm text-secondary-text">{order.customer} · {order.items.length} line items · {order.promisedInMinutes} min promise</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary">Confirm</Button>
                  <Button size="sm"><ClipboardCheck /> Process</Button>
                </div>
              </div>
            ))}
          </div>
        </OperationalCard>

        <OperationalCard title="Operational notifications" description="Seller alerts from local and Supabase realtime streams.">
          <div className="space-y-3">
            <LiveEventFeed scope="seller" limit={3} />
            {notifications.slice(0, 4).map((notification) => (
              <div key={notification.id} className="rounded-md border border-border bg-slate-50 p-3">
                <div className="flex items-start gap-2">
                  <Bell className="mt-0.5 size-4 text-secondary-text" />
                  <div>
                    <p className="text-sm font-medium text-primary-text">{notification.title}</p>
                    <p className="mt-1 text-xs text-secondary-text">{notification.detail}</p>
                    <p className="mt-2 text-xs font-medium text-secondary-text">{notification.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </OperationalCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <OperationalCard title="Low stock alerts" description="Actionable replenishment signals.">
          <div className="space-y-3">
            {lowStock.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-md bg-amber-50 p-3">
                <div>
                  <p className="text-sm font-medium text-primary-text">{item.name}</p>
                  <p className="text-xs text-secondary-text">{item.stock} available · {item.reserved} reserved</p>
                </div>
                <StatusBadge status={inventoryStatus(item)} />
              </div>
            ))}
          </div>
        </OperationalCard>

        <OperationalCard title="Top products" description="Fast movers from live seller inventory movement.">
          <div className="space-y-3">
            {[...data.products].sort((a, b) => b.soldToday - a.soldToday).slice(0, 4).map((product) => (
              <div key={product.id} className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-primary-text">{product.name}</p>
                  <p className="text-xs text-secondary-text">{product.sku}</p>
                </div>
                <p className="text-sm font-semibold text-primary-text">{product.soldToday} sold</p>
              </div>
            ))}
          </div>
        </OperationalCard>

        <OperationalCard title="Performance overview" description="Revenue and order movement from seller operations.">
          <OperationalBarChart values={data.analytics.sales.length ? data.analytics.sales : [0]} />
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-xs text-secondary-text">Health score</p>
              <p className="font-semibold text-primary-text">{data.intelligence?.summary.healthScore ?? 0}/100</p>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-xs text-secondary-text">Order flow</p>
              <p className="font-semibold text-primary-text">{data.orders.length} live orders</p>
            </div>
          </div>
        </OperationalCard>
      </div>

      <OperationalCard title="Inventory health summary" description="Readable stock state by operational category.">
        <div className="grid gap-3 sm:grid-cols-4">
          {["in_stock", "low_stock", "out_of_stock", "archived"].map((state) => (
            <div key={state} className="rounded-md border border-border bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase text-secondary-text">{statusLabel(state as never)}</p>
              <p className="mt-2 text-2xl font-semibold text-primary-text">{data.inventory.filter((item) => inventoryStatus(item) === state).length}</p>
            </div>
          ))}
        </div>
      </OperationalCard>

      <OperationalCard title="Live marketplace stream" description="Recent order, inventory, tracking, and notification events.">
        <LiveEventFeed limit={6} />
      </OperationalCard>
    </div>
  );
}
