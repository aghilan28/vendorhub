"use client";

import Link from "next/link";
import { Activity, AlertTriangle, Boxes, LineChart, Search, Sparkles, Tags, Truck } from "lucide-react";
import { OperationalBarChart } from "@/components/charts/operational-bar-chart";
import { MetricCard } from "@/components/dashboard/metric-card";
import { useSellerIntelligence } from "@/features/seller/queries";
import { EmptyState, IntelPageHeader, IntelSection, LoadingState, ScoreBar, StatusPill } from "./primitives";

const pct = (value: number) => `${Math.round(value * 100)}%`;

const studios = [
  { href: "/pricing", label: "Pricing Studio", desc: "Price positioning, simulation & approvals", icon: Tags },
  { href: "/forecasting", label: "Forecast Studio", desc: "Demand forecasts & scenarios", icon: LineChart },
  { href: "/inventory-intelligence", label: "Inventory Intelligence", desc: "Stock risk & reorder", icon: Boxes },
  { href: "/supply-intelligence", label: "Supply Intelligence", desc: "Hyperlocal demand & opportunity", icon: Sparkles },
  { href: "/routing", label: "Routing & Fulfillment", desc: "Fulfillment bottlenecks", icon: Truck },
  { href: "/search-intelligence", label: "Search Intelligence", desc: "Discoverability analytics", icon: Search },
  { href: "/recommendations", label: "Recommendations", desc: "Recommendation insights", icon: Sparkles },
  { href: "/telemetry", label: "Telemetry", desc: "Operational & commerce analytics", icon: Activity },
];

export function CommerceCommandCenterScreen() {
  const { data: intel, isLoading } = useSellerIntelligence();

  if (isLoading) return <LoadingState />;
  if (!intel) {
    return (
      <EmptyState
        title="Commerce intelligence is not available yet"
        hint="Sign in as a seller with catalog and order activity. Intelligence is generated from your live products, inventory, and orders."
      />
    );
  }

  const s = intel.summary;
  const alerts = intel.insights.filter((i) => i.severity === "warning" || i.severity === "critical");

  return (
    <div className="space-y-6">
      <IntelPageHeader
        eyebrow="Commerce Intelligence"
        title="Command Center"
        subtitle="Unified view of demand, inventory, pricing, fulfillment, and discoverability — generated from your live commerce data."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <ScoreBar label="Health" score={s.healthScore} />
        <ScoreBar label="Demand" score={s.demandScore} />
        <ScoreBar label="Inventory" score={s.inventoryScore} />
        <ScoreBar label="Fulfillment" score={s.fulfillmentScore} />
        <ScoreBar label="Discoverability" score={s.discoverabilityScore} />
        <ScoreBar label="Fairness" score={s.fairnessScore} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Active orders" value={String(intel.fulfillment.activeOrders)} />
        <MetricCard label="Fulfillment rate" value={pct(intel.fulfillment.fulfillmentRate)} />
        <MetricCard label="Delayed orders" value={String(intel.fulfillment.delayedOrders)} />
        <MetricCard label="Avg promise (min)" value={String(Math.round(intel.fulfillment.averagePromiseMinutes))} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <IntelSection title="Intelligence scores" description="Relative strength across commerce domains (0–100)." >
          <OperationalBarChart
            values={[s.healthScore, s.demandScore, s.inventoryScore, s.fulfillmentScore, s.discoverabilityScore, s.fairnessScore]}
          />
        </IntelSection>

        <IntelSection
          title="Alerts"
          description="Insights requiring attention."
          action={<span className="inline-flex items-center gap-1 text-xs text-secondary-text"><AlertTriangle className="size-3.5" />{alerts.length}</span>}
        >
          {alerts.length === 0 ? (
            <p className="text-sm text-secondary-text">No warnings or critical insights right now.</p>
          ) : (
            <ul className="space-y-3">
              {alerts.slice(0, 6).map((a) => (
                <li key={a.id} className="rounded-md border border-border/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-primary-text">{a.title}</p>
                    <StatusPill value={a.severity} />
                  </div>
                  <p className="mt-1 text-xs text-secondary-text">{a.action}</p>
                </li>
              ))}
            </ul>
          )}
        </IntelSection>

        <IntelSection title="Top insights" description="Highest-confidence opportunities and signals.">
          <ul className="space-y-3">
            {intel.insights.slice(0, 6).map((i) => (
              <li key={i.id} className="rounded-md border border-border/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-primary-text">{i.title}</p>
                  <StatusPill value={i.domain} />
                </div>
                <p className="mt-1 text-xs text-secondary-text">{i.explanation}</p>
              </li>
            ))}
          </ul>
        </IntelSection>
      </div>

      <IntelSection title="Intelligence studios" description="Open a dedicated workspace for each capability.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {studios.map((studio) => (
            <Link key={studio.href} href={studio.href} className="operational-surface group rounded-lg border border-border/60 p-4 transition hover:border-primary">
              <studio.icon className="size-5 text-secondary-text group-hover:text-primary" />
              <p className="mt-2 text-sm font-semibold text-primary-text">{studio.label}</p>
              <p className="mt-1 text-xs text-secondary-text">{studio.desc}</p>
            </Link>
          ))}
        </div>
      </IntelSection>

      <p className="text-xs text-secondary-text">
        Generated {new Date(intel.generatedAt).toLocaleString()} · source: {intel.observability.source} · {intel.observability.generatedInMs}ms
        {intel.stale ? " · stale (showing last good snapshot)" : ""}
      </p>
    </div>
  );
}
