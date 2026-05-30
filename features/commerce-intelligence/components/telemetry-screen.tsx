"use client";

import { OperationalBarChart } from "@/components/charts/operational-bar-chart";
import { MetricCard } from "@/components/dashboard/metric-card";
import { useSellerDashboard } from "@/features/seller/queries";
import { EmptyState, IntelPageHeader, IntelSection, LoadingState, StatusPill } from "./primitives";

const pct = (value: number) => `${Math.round(value * 100)}%`;

export function TelemetryScreen() {
  const { data: snapshot, isLoading } = useSellerDashboard();
  if (isLoading) return <LoadingState />;
  if (!snapshot) {
    return <EmptyState title="No telemetry yet" hint="Commerce and operational analytics appear once your workspace has activity." />;
  }

  const analytics = snapshot.analytics;
  const intel = snapshot.intelligence;

  return (
    <div className="space-y-6">
      <IntelPageHeader eyebrow="Telemetry" title="Commerce & operational analytics" subtitle="Behavioral, commerce, and operational signals across your workspace." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <IntelSection title="Sales trend" description="Recent sales signal.">
          {analytics.sales.length ? <OperationalBarChart values={analytics.sales} /> : <p className="text-sm text-secondary-text">No sales data.</p>}
        </IntelSection>
        <IntelSection title="Orders trend" description="Recent order volume.">
          {analytics.orders.length ? <OperationalBarChart values={analytics.orders} /> : <p className="text-sm text-secondary-text">No order data.</p>}
        </IntelSection>
      </div>

      {intel ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard label="Health" value={`${Math.round(intel.summary.healthScore)}/100`} />
            <MetricCard label="Fulfillment rate" value={pct(intel.fulfillment.fulfillmentRate)} />
            <MetricCard label="Active orders" value={String(intel.fulfillment.activeOrders)} />
            <MetricCard label="Cancellation rate" value={pct(intel.fulfillment.cancellationRate)} />
          </div>

          <IntelSection title="Signal stream" description="Most recent intelligence signals (trend detection).">
            <ul className="space-y-2">
              {intel.insights.slice(0, 10).map((i) => (
                <li key={i.id} className="flex items-start justify-between gap-3 rounded-md border border-border/60 p-3">
                  <div>
                    <p className="text-sm font-medium text-primary-text">{i.title}</p>
                    <p className="text-xs text-secondary-text">{i.explanation}</p>
                  </div>
                  <StatusPill value={i.severity} />
                </li>
              ))}
            </ul>
          </IntelSection>

          <p className="text-xs text-secondary-text">
            Snapshot source: {intel.observability.source} · generated in {intel.observability.generatedInMs}ms · TTL {intel.observability.snapshotTtlMinutes}m
            {intel.observability.refreshReasons.length ? ` · ${intel.observability.refreshReasons.join(", ")}` : ""}
          </p>
        </>
      ) : (
        <EmptyState title="Intelligence telemetry unavailable" hint="Merchant-intelligence snapshot not present in this workspace yet." />
      )}
    </div>
  );
}
