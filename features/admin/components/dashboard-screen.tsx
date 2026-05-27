"use client";

import { AlertTriangle, Bell, Flag, ShieldCheck, Store } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { OperationalBarChart } from "@/components/charts/operational-bar-chart";
import { ProductionExperiencePanel } from "@/components/experience/production-experience-panel";
import { TrustStrip } from "@/components/experience/trust-strip";
import { Button } from "@/components/ui/button";
import { LiveEventFeed } from "@/components/realtime/live-event-feed";
import { LiveStateBadge } from "@/components/realtime/live-state-badge";
import { AdminGeoPanel } from "@/features/geo/components/admin-geo-panel";
import { AdminIntelligencePanel } from "@/features/intelligence/components/admin-intelligence-panel";
import { AdminDeliveryPanel } from "@/features/logistics/components/admin-delivery-panel";
import { useTrustSummary } from "@/features/trust/queries";
import { useAdminDashboard } from "../queries";
import { labelize, moderationTone, severityTone, vendorTone } from "../utils";
import { AdminDashboardSkeleton } from "./loading";
import { GovernanceBadge } from "./governance-badge";
import { GovernanceCard } from "./governance-card";
import { GovernanceMetricCard } from "./governance-metric-card";

export function AdminDashboardScreen() {
  const { data, isLoading, isError } = useAdminDashboard();
  const { data: trustSummary } = useTrustSummary();
  if (isLoading) return <AdminDashboardSkeleton />;
  if (isError || !data) return <EmptyState icon={AlertTriangle} title="Governance command center could not load" description="Admin operational data is temporarily unavailable." actionLabel="Retry dashboard" />;

  const pendingVendors = data.vendors.filter((vendor) => vendor.status === "pending" || vendor.status === "needs_review");
  const queue = data.moderationCases.filter((item) => item.status === "pending_review" || item.status === "flagged");

  return (
    <div className="space-y-6">
      <section className="operational-surface rounded-lg p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-secondary-text">Marketplace-wide governance</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-primary-text">VendorHub command center</h1>
            <p className="mt-2 max-w-3xl text-sm text-secondary-text">Operational oversight for seller approvals, moderation pressure, refunds, category governance, and platform health placeholders.</p>
            <div className="mt-3">
              <LiveStateBadge />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {["Audit-ready actions", "Manual moderation", "Health placeholder 94%"].map((item) => (
              <div key={item} className="rounded-md border border-border bg-slate-50 px-3 py-2 text-sm font-medium text-primary-text">{item}</div>
            ))}
          </div>
        </div>
      </section>

      <ProductionExperiencePanel
        compact
        input={{
          persona: "admin",
          realtimeState: "connected",
          operationalPressure: Math.min(100, pendingVendors.length * 12 + queue.length * 16 + data.flags.length * 8),
          accessibilityMode: true,
        }}
      />

      <TrustStrip
        label="Admin governance trust indicators"
        items={[
          { label: "Governance", value: `${pendingVendors.length} seller reviews`, icon: Store },
          { label: "Moderation", value: `${queue.length} active cases`, icon: Flag },
          { label: "Trust", value: trustSummary ? `${trustSummary.openFlags} open flags` : "Summary loading", icon: ShieldCheck },
          { label: "Realtime", value: "Operator stream visible", icon: Bell },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.governanceMetrics.map((metric) => <GovernanceMetricCard key={metric.label} metric={metric} />)}
      </div>

      {trustSummary ? (
        <GovernanceCard title="Trust and compliance overview" description="Verification completion, seller legitimacy, compliance flags, and suspension readiness.">
          <div className="grid gap-3 md:grid-cols-5">
            <div className="rounded-md bg-emerald-50 p-3"><p className="text-xs text-secondary-text">Verified sellers</p><p className="mt-2 text-2xl font-semibold text-primary-text">{trustSummary.verifiedSellers}</p></div>
            <div className="rounded-md bg-amber-50 p-3"><p className="text-xs text-secondary-text">Pending reviews</p><p className="mt-2 text-2xl font-semibold text-primary-text">{trustSummary.pendingReviews}</p></div>
            <div className="rounded-md bg-amber-50 p-3"><p className="text-xs text-secondary-text">Resubmissions</p><p className="mt-2 text-2xl font-semibold text-primary-text">{trustSummary.resubmissions}</p></div>
            <div className="rounded-md bg-red-50 p-3"><p className="text-xs text-secondary-text">Suspended</p><p className="mt-2 text-2xl font-semibold text-primary-text">{trustSummary.suspendedSellers}</p></div>
            <div className="rounded-md bg-slate-50 p-3"><p className="text-xs text-secondary-text">Open flags</p><p className="mt-2 text-2xl font-semibold text-primary-text">{trustSummary.openFlags}</p></div>
          </div>
        </GovernanceCard>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
        <GovernanceCard title="Marketplace activity" description="Platform-wide activity with realtime cache synchronization.">
          <OperationalBarChart values={[80, 72, 84, 91, 88, 96, 102, 97, 108, 116, 109, 121]} />
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {["4,892 orders", "342 active sellers", "23 flagged records"].map((item) => <div key={item} className="rounded-md bg-slate-50 p-3 text-sm font-medium text-primary-text">{item}</div>)}
          </div>
        </GovernanceCard>

        <GovernanceCard title="Operational alerts" description="High-signal anomalies and trust events.">
          <div className="space-y-3">
            {data.flags.slice(0, 4).map((flag) => (
              <div key={flag.id} className="rounded-md border border-border bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-primary-text">{flag.subject}</p><GovernanceBadge label={flag.severity} tone={severityTone(flag.severity)} /></div>
                <p className="mt-1 text-xs text-secondary-text">{flag.detail}</p>
              </div>
            ))}
          </div>
        </GovernanceCard>
      </div>

      <GovernanceCard title="Marketplace intelligence" description="Search relevance, recommendation readiness, and demand signal placeholders.">
        <AdminIntelligencePanel />
      </GovernanceCard>

      <GovernanceCard title="Geo governance" description="Vendor coverage, service radius, regional density, and local marketplace activity.">
        <AdminGeoPanel />
      </GovernanceCard>

      <GovernanceCard title="Delivery governance" description="Dispatch monitoring, failed delivery visibility, provider sync, and ETA performance foundations.">
        <AdminDeliveryPanel />
      </GovernanceCard>

      <div className="grid gap-6 xl:grid-cols-3">
        <GovernanceCard title="Pending approvals" description="Seller governance queue.">
          <div className="space-y-3">
            {pendingVendors.map((vendor) => (
              <div key={vendor.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3"><p className="font-medium text-primary-text">{vendor.businessName}</p><GovernanceBadge label={vendor.status} tone={vendorTone(vendor.status)} /></div>
                <p className="mt-1 text-xs text-secondary-text">{vendor.category} · {vendor.zone}</p>
                <div className="mt-3 flex gap-2"><Button size="sm">Review</Button><Button size="sm" variant="secondary">Approve</Button></div>
              </div>
            ))}
          </div>
        </GovernanceCard>

        <GovernanceCard title="Moderation queue" description="Deliberate review workflow.">
          <div className="space-y-3">
            {queue.map((item) => (
              <div key={item.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3"><p className="font-medium text-primary-text">{item.id}</p><GovernanceBadge label={item.status} tone={moderationTone(item.status)} /></div>
                <p className="mt-1 text-sm text-primary-text">{item.title}</p>
                <p className="mt-1 text-xs text-secondary-text">{item.reason}</p>
              </div>
            ))}
          </div>
        </GovernanceCard>

        <GovernanceCard title="Trust metrics placeholder" description="Authoritative trust language without fraud AI.">
          <div className="space-y-3">
            <div className="rounded-md bg-emerald-50 p-3"><ShieldCheck className="size-4 text-success" /><p className="mt-2 text-sm font-medium text-primary-text">Seller verification placeholders reviewed manually</p></div>
            <div className="rounded-md bg-amber-50 p-3"><Flag className="size-4 text-warning" /><p className="mt-2 text-sm font-medium text-primary-text">4 critical escalation indicators</p></div>
            <div className="rounded-md bg-slate-50 p-3"><Store className="size-4 text-secondary-text" /><p className="mt-2 text-sm font-medium text-primary-text">Category insights placeholder ready</p></div>
          </div>
        </GovernanceCard>
      </div>

      <GovernanceCard title="Admin notifications" description="Operational, moderation, seller, system, and refund alerts.">
        <div className="grid gap-3 md:grid-cols-2">
          {data.adminNotifications.map((notification) => (
            <div key={notification.id} className="rounded-md border border-border p-3">
              <div className="flex items-center gap-2"><Bell className="size-4 text-secondary-text" /><p className="font-medium text-primary-text">{notification.title}</p>{!notification.read ? <GovernanceBadge label="unread" tone="warning" /> : null}</div>
              <p className="mt-1 text-sm text-secondary-text">{notification.detail}</p>
              <p className="mt-2 text-xs font-medium text-secondary-text">{labelize(notification.type)} · {notification.time}</p>
            </div>
          ))}
        </div>
      </GovernanceCard>

      <GovernanceCard title="Live marketplace stream" description="Realtime operational events across orders, stock, and notifications.">
        <LiveEventFeed scope="admin" limit={8} />
      </GovernanceCard>
    </div>
  );
}
